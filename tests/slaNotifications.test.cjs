const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');

/**
 * Carrega um módulo TypeScript (.ts/.tsx) transpilando em memória com mocks de dependências nativas.
 */
function loadTsModule(relativePath, mocks = {}) {
    const entryPath = path.resolve(ROOT, relativePath);
    const originalLoad = Module._load;
    const originalResolveFilename = Module._resolveFilename;
    const prevTs = require.extensions['.ts'];
    const prevTsx = require.extensions['.tsx'];

    const compileTs = (module, filename) => {
        const source = fs.readFileSync(filename, 'utf8');
        const transpiled = ts.transpileModule(source, {
            fileName: filename,
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
                jsx: ts.JsxEmit.React,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
            },
        });
        module._compile(transpiled.outputText, filename);
    };

    require.extensions['.ts'] = compileTs;
    require.extensions['.tsx'] = compileTs;

    Module._resolveFilename = function (request, parent, isMain, options) {
        if (Object.prototype.hasOwnProperty.call(mocks, request)) {
            return request;
        }
        return originalResolveFilename.call(this, request, parent, isMain, options);
    };

    Module._load = function (request, parent, isMain) {
        if (Object.prototype.hasOwnProperty.call(mocks, request)) {
            return mocks[request];
        }
        return originalLoad.call(this, request, parent, isMain);
    };

    // Limpa cache de módulos locais da aplicação para garantir isolamento entre testes
    for (const key of Object.keys(require.cache)) {
        if (key.startsWith(ROOT) && !key.includes('node_modules')) {
            delete require.cache[key];
        }
    }

    try {
        return require(entryPath);
    } finally {
        Module._load = originalLoad;
        Module._resolveFilename = originalResolveFilename;
        if (prevTs) require.extensions['.ts'] = prevTs;
        else delete require.extensions['.ts'];
        if (prevTsx) require.extensions['.tsx'] = prevTsx;
        else delete require.extensions['.tsx'];
    }
}

function createNotificationsMock(overrides = {}) {
    return {
        AndroidImportance: { HIGH: 4 },
        SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
        setNotificationHandler: () => {},
        setNotificationChannelAsync: async () => null,
        requestPermissionsAsync: async () => ({ granted: true }),
        scheduleNotificationAsync: async () => 'notif-default-id',
        cancelScheduledNotificationAsync: async () => {},
        addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
        getLastNotificationResponse: () => null,
        ...overrides,
    };
}

test('1. Firebase config usa o projeto techcall3-99ef9 e exporta db, storage e ALUNO_ID', () => {
    let capturedConfig = null;
    const mockApp = { name: '[DEFAULT]' };
    const mockDb = { type: 'firestore' };
    const mockStorage = { type: 'storage' };

    const mod = loadTsModule('src/firebase/config.ts', {
        'firebase/app': {
            initializeApp: (cfg) => {
                capturedConfig = cfg;
                return mockApp;
            },
        },
        'firebase/firestore': {
            getFirestore: (app) => {
                assert.equal(app, mockApp);
                return mockDb;
            },
        },
        'firebase/storage': {
            getStorage: (app) => {
                assert.equal(app, mockApp);
                return mockStorage;
            },
        },
    });

    assert.deepEqual(capturedConfig, {
        apiKey: 'AIzaSyBlxN5obzzkK98Rg7NmTO1EFXa-6t5Qz60',
        authDomain: 'techcall3-99ef9.firebaseapp.com',
        projectId: 'techcall3-99ef9',
        storageBucket: 'techcall3-99ef9.firebasestorage.app',
        messagingSenderId: '127162678608',
        appId: '1:127162678608:web:502faafe6b70d62f43c055',
    });
    assert.equal(mod.db, mockDb);
    assert.equal(mod.storage, mockStorage);
    assert.equal(mod.ALUNO_ID, 'RA2457042');
});

test('2. App.tsx configura o NotificationHandler global e exporta navigationRef', async () => {
    let registeredHandler = null;
    const navRefStub = { isReady: () => true, navigate: () => {} };

    const appMod = loadTsModule('App.tsx', {
        'react-native': {
            Platform: { OS: 'android' },
            Alert: { alert: () => {} },
            StyleSheet: { create: (s) => s },
        },
        'expo-status-bar': { StatusBar: () => null },
        '@react-navigation/native': {
            NavigationContainer: () => null,
            createNavigationContainerRef: () => navRefStub,
            useFocusEffect: () => {},
        },
        '@react-navigation/native-stack': {
            createNativeStackNavigator: () => ({ Navigator: () => null, Screen: () => null }),
        },
        'expo-notifications': createNotificationsMock({
            setNotificationHandler: (handler) => {
                registeredHandler = handler;
            },
        }),
        'expo-image-picker': {},
        'expo-location': {},
        'firebase/app': { initializeApp: () => ({}) },
        'firebase/firestore': {
            getFirestore: () => ({}),
            collection: () => ({}),
            doc: () => ({}),
            getDoc: async () => ({ exists: () => false }),
            getDocs: async () => ({ docs: [] }),
            addDoc: async () => ({ id: '1' }),
            updateDoc: async () => {},
            query: () => ({}),
            orderBy: () => ({}),
            serverTimestamp: () => 'ts',
        },
        'firebase/storage': { getStorage: () => ({}) },
    });

    assert.equal(appMod.navigationRef, navRefStub);
    assert.ok(registeredHandler, 'setNotificationHandler deveria ter sido chamado');
    const behavior = await registeredHandler.handleNotification({});
    assert.deepEqual(behavior, {
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    });
});

test('3. setupAndroidNotificationChannel registra o canal "chamados" no Android', async () => {
    const channelCalls = [];
    const mod = loadTsModule('src/services/notificationService.ts', {
        'react-native': { Platform: { OS: 'android' }, Alert: { alert: () => {} } },
        'expo-notifications': createNotificationsMock({
            setNotificationChannelAsync: async (id, config) => {
                channelCalls.push({ id, config });
                return null;
            },
        }),
    });

    await mod.setupAndroidNotificationChannel();

    assert.equal(channelCalls.length, 1);
    assert.equal(channelCalls[0].id, 'chamados');
    assert.deepEqual(channelCalls[0].config, {
        name: 'Atualizações de chamados',
        importance: 4,
    });
});

test('4. setupAndroidNotificationChannel não registra canal em plataformas não-Android', async () => {
    let called = false;
    for (const os of ['ios', 'web']) {
        const mod = loadTsModule('src/services/notificationService.ts', {
            'react-native': { Platform: { OS: os }, Alert: { alert: () => {} } },
            'expo-notifications': createNotificationsMock({
                setNotificationChannelAsync: async () => {
                    called = true;
                    return null;
                },
            }),
        });
        await mod.setupAndroidNotificationChannel();
    }
    assert.equal(called, false);
});

test('5. scheduleSlaNotification alerta o usuário e retorna null quando permissão é negada', async () => {
    const alerts = [];
    let scheduled = false;

    const mod = loadTsModule('src/services/notificationService.ts', {
        'react-native': {
            Platform: { OS: 'android' },
            Alert: { alert: (title, message) => alerts.push({ title, message }) },
        },
        'expo-notifications': createNotificationsMock({
            requestPermissionsAsync: async () => ({ granted: false }),
            scheduleNotificationAsync: async () => {
                scheduled = true;
                return 'should-not-happen';
            },
        }),
    });

    const result = await mod.scheduleSlaNotification('chamado-negado');

    assert.equal(result, null);
    assert.equal(scheduled, false);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].title, 'Permissão de Notificação Negada');
});

test('6. scheduleSlaNotification agenda notificação TIME_INTERVAL de SLA com channelId no Android', async () => {
    let capturedRequest = null;

    const mod = loadTsModule('src/services/notificationService.ts', {
        'react-native': {
            Platform: { OS: 'android' },
            Alert: { alert: () => {} },
        },
        'expo-notifications': createNotificationsMock({
            requestPermissionsAsync: async () => ({ granted: true }),
            scheduleNotificationAsync: async (req) => {
                capturedRequest = req;
                return 'notif-sla-42';
            },
        }),
    });

    const id = await mod.scheduleSlaNotification('chamado-42');

    assert.equal(id, 'notif-sla-42');
    assert.deepEqual(capturedRequest, {
        content: {
            title: 'TechCall - Alerta de SLA',
            body: 'O prazo de atendimento de um chamado expirou!',
            data: { chamadoId: 'chamado-42' },
        },
        trigger: {
            type: 'timeInterval',
            seconds: mod.SLA_SECONDS,
            channelId: 'chamados',
        },
    });
});

test('7. scheduleSlaNotification e cancelSlaNotification ignoram chamadas nativas na Web sem erro', async () => {
    let nativeCalled = false;

    const mod = loadTsModule('src/services/notificationService.ts', {
        'react-native': {
            Platform: { OS: 'web' },
            Alert: { alert: () => {} },
        },
        'expo-notifications': createNotificationsMock({
            requestPermissionsAsync: async () => {
                nativeCalled = true;
                return { granted: true };
            },
            scheduleNotificationAsync: async () => {
                nativeCalled = true;
                return 'id';
            },
            cancelScheduledNotificationAsync: async () => {
                nativeCalled = true;
            },
        }),
    });

    const scheduledId = await mod.scheduleSlaNotification('chamado-web');
    await mod.cancelSlaNotification('notif-web');

    assert.equal(scheduledId, null);
    assert.equal(nativeCalled, false);
});

test('8. shouldCancelSlaForStatus e cancelSlaNotification cancelam apenas para status válidos e id existente', async () => {
    const cancelledIds = [];

    const mod = loadTsModule('src/services/notificationService.ts', {
        'react-native': {
            Platform: { OS: 'android' },
            Alert: { alert: () => {} },
        },
        'expo-notifications': createNotificationsMock({
            cancelScheduledNotificationAsync: async (id) => {
                cancelledIds.push(id);
            },
        }),
    });

    assert.equal(mod.shouldCancelSlaForStatus('em andamento'), true);
    assert.equal(mod.shouldCancelSlaForStatus('atendendo'), true);
    assert.equal(mod.shouldCancelSlaForStatus('concluído'), true);
    assert.equal(mod.shouldCancelSlaForStatus('concluido'), true);
    assert.equal(mod.shouldCancelSlaForStatus('cancelado'), true);
    assert.equal(mod.shouldCancelSlaForStatus('EM ANDAMENTO'), true);
    assert.equal(mod.shouldCancelSlaForStatus('aberto'), false);

    await mod.cancelSlaNotification(null);
    await mod.cancelSlaNotification(undefined);
    await mod.cancelSlaNotification('notif-99');

    assert.deepEqual(cancelledIds, ['notif-99']);
});

test('9. extractChamadoIdFromResponse extrai chamadoId válido e ignora payloads inválidos', () => {
    const mod = loadTsModule('src/services/notificationService.ts', {
        'react-native': { Platform: { OS: 'android' }, Alert: { alert: () => {} } },
        'expo-notifications': createNotificationsMock(),
    });

    assert.equal(
        mod.extractChamadoIdFromResponse({
            notification: { request: { content: { data: { chamadoId: 'abc-123' } } } },
        }),
        'abc-123'
    );
    assert.equal(mod.extractChamadoIdFromResponse(null), undefined);
    assert.equal(mod.extractChamadoIdFromResponse(undefined), undefined);
    assert.equal(
        mod.extractChamadoIdFromResponse({
            notification: { request: { content: { data: { chamadoId: '   ' } } } },
        }),
        undefined
    );
    assert.equal(
        mod.extractChamadoIdFromResponse({
            notification: { request: { content: { data: { chamadoId: 123 } } } },
        }),
        undefined
    );
});

test('10. callService cria chamado, grava slaNotificationId, atualiza status e recupera documento', async () => {
    const store = new Map();
    const calls = { add: [], update: [] };

    const { callService } = loadTsModule('src/services/callService.ts', {
        'firebase/app': { initializeApp: () => ({}) },
        'firebase/storage': { getStorage: () => ({}) },
        'firebase/firestore': {
            getFirestore: () => ({ type: 'db' }),
            collection: (_db, ...segments) => ({ path: segments.join('/') }),
            doc: (_db, ...segments) => ({ id: segments[segments.length - 1], path: segments.join('/') }),
            serverTimestamp: () => 'SERVER_TS',
            query: () => ({}),
            orderBy: () => ({}),
            getDocs: async () => ({ docs: [] }),
            addDoc: async (colRef, payload) => {
                const id = 'chamado-novo-1';
                calls.add.push({ path: colRef.path, payload });
                store.set(id, { ...payload });
                return { id };
            },
            updateDoc: async (docRef, payload) => {
                calls.update.push({ path: docRef.path, payload });
                const current = store.get(docRef.id) || {};
                store.set(docRef.id, { ...current, ...payload });
            },
            getDoc: async (docRef) => {
                const data = store.get(docRef.id);
                return {
                    id: docRef.id,
                    exists: () => Boolean(data),
                    data: () => data,
                };
            },
        },
    });

    const createdId = await callService.criarChamado({
        description: 'Impressora offline',
        photoUri: null,
        address: 'Sala 12',
    });
    assert.equal(createdId, 'chamado-novo-1');
    assert.equal(calls.add[0].path, 'alunos/RA2457042/chamados');
    assert.equal(calls.add[0].payload.status, 'aberto');

    await callService.salvarSlaNotificationId(createdId, 'notif-sla-01');
    assert.deepEqual(calls.update[0], {
        path: 'alunos/RA2457042/chamados/chamado-novo-1',
        payload: { slaNotificationId: 'notif-sla-01' },
    });

    await callService.atualizarStatus(createdId, 'em andamento');
    const fetched = await callService.buscarPorId(createdId);
    assert.deepEqual(fetched, {
        id: 'chamado-novo-1',
        description: 'Impressora offline',
        photoUri: null,
        address: 'Sala 12',
        status: 'em andamento',
        criadoEm: 'SERVER_TS',
        slaNotificationId: 'notif-sla-01',
    });
});
