import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const SLA_SECONDS = 10; // em produção, substituir por um valor real
export const NOTIFICATION_CHANNEL_ID = 'chamados';

const STATUS_QUE_CANCELAM_SLA = new Set([
    'em andamento',
    'atendendo',
    'concluído',
    'concluido',
    'cancelado',
]);

/**
 * Configura o canal de notificações no Android (obrigatório a partir do Android 8).
 */
export async function setupAndroidNotificationChannel(): Promise<void> {
    if (Platform.OS !== 'android') {
        return;
    }

    try {
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
            name: 'Atualizações de chamados',
            importance: Notifications.AndroidImportance.HIGH,
        });
    } catch (error) {
        console.log('Canal já existe ou falhou ao registrar:', error);
    }
}

/**
 * Extrai com segurança o `chamadoId` do payload de uma resposta de notificação.
 */
export function extractChamadoIdFromResponse(
    response: Notifications.NotificationResponse | null | undefined
): string | undefined {
    const data = response?.notification?.request?.content?.data as
        | Record<string, unknown>
        | undefined;
    const chamadoId = data?.chamadoId;
    if (typeof chamadoId === 'string' && chamadoId.trim().length > 0) {
        return chamadoId;
    }
    return undefined;
}

/**
 * Verifica se o novo status deve cancelar um alerta de SLA agendado.
 */
export function shouldCancelSlaForStatus(novoStatus: string): boolean {
    return STATUS_QUE_CANCELAM_SLA.has(novoStatus.trim().toLowerCase());
}

/**
 * Solicita permissão e agenda a notificação local de alerta de SLA para um chamado.
 * Retorna o identificador da notificação agendada ou `null` se não for possível agendar.
 */
export async function scheduleSlaNotification(
    chamadoId: string,
    seconds: number = SLA_SECONDS
): Promise<string | null> {
    if (Platform.OS === 'web') {
        return null;
    }

    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
        Alert.alert(
            'Permissão de Notificação Negada',
            'Você não receberá alertas de SLA. Para ativar, habilite as notificações nas configurações do seu celular.'
        );
        return null;
    }

    const trigger: Notifications.TimeIntervalTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
            title: 'TechCall - Alerta de SLA',
            body: 'O prazo de atendimento de um chamado expirou!',
            data: { chamadoId },
        },
        trigger,
    });

    return notificationId;
}

/**
 * Cancela uma notificação de SLA agendada que ainda não disparou.
 */
export async function cancelSlaNotification(notificationId?: string | null): Promise<void> {
    if (!notificationId || Platform.OS === 'web') {
        return;
    }

    await Notifications.cancelScheduledNotificationAsync(notificationId);
}
