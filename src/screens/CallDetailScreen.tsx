import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { callService, Chamado } from '../services/callService';
import { cancelSlaNotification, shouldCancelSlaForStatus } from '../services/notificationService';
import { COLORS } from '../theme/colors';

export default function CallDetailScreen({ route }: any) {
    const { chamadoId } = route.params;
    const [chamado, setChamado] = useState<Chamado | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function carregar() {
            setLoading(true);
            try {
                const dados = await callService.buscarPorId(chamadoId);
                if (dados) {
                    setChamado(dados);
                } else {
                    Alert.alert('Erro', 'Chamado não encontrado.');
                }
            } catch (error) {
                Alert.alert('Erro', 'Não foi possível carregar os detalhes do chamado.');
            } finally {
                setLoading(false);
            }
        }
        carregar();
    }, [chamadoId]);

    async function mudarStatus(novoStatus: string) {
        try {
            await callService.atualizarStatus(chamadoId, novoStatus);
            if (shouldCancelSlaForStatus(novoStatus) && chamado?.slaNotificationId) {
                await cancelSlaNotification(chamado.slaNotificationId);
            }
            setChamado((prev) => (prev ? { ...prev, status: novoStatus } : null));
            Alert.alert('Sucesso', `Status alterado para "${novoStatus}".`);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível atualizar o status.');
        }
    }

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'concluído' || s === 'concluido') return COLORS.statusConcluido;
        if (s === 'em andamento') return COLORS.statusEmAndamento;
        return COLORS.statusAberto;
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primaryCyan} />
            </View>
        );
    }

    if (!chamado) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Chamado não encontrado.</Text>
            </View>
        );
    }

    const currentColor = getStatusColor(chamado.status);

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={[styles.card, { borderColor: currentColor + '60' }]}>
                <Text style={styles.label}>Status Atual</Text>
                <View style={[styles.statusBadge, { borderColor: currentColor, backgroundColor: currentColor + '15' }]}>
                    <Text style={[styles.statusText, { color: currentColor }]}>
                        ● {chamado.status.toUpperCase()}
                    </Text>
                </View>

                <Text style={styles.label}>Descrição do Problema</Text>
                <Text style={styles.valueText}>{chamado.description}</Text>

                {chamado.address ? (
                    <>
                        <Text style={styles.label}>Localização Registrada</Text>
                        <Text style={styles.valueText}>📍 {chamado.address}</Text>
                    </>
                ) : null}

                {chamado.photoUri ? (
                    <>
                        <Text style={styles.label}>Foto do Equipamento</Text>
                        <Image source={{ uri: chamado.photoUri }} style={styles.photo} />
                    </>
                ) : null}
            </View>

            <Text style={styles.sectionTitle}>Atualizar Status</Text>
            <View style={styles.buttonGroup}>
                <TouchableOpacity
                    style={[styles.button, styles.inProgressButton]}
                    activeOpacity={0.8}
                    onPress={() => mudarStatus('em andamento')}
                >
                    <Text style={styles.buttonText}>EM ANDAMENTO</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.doneButton]}
                    activeOpacity={0.8}
                    onPress={() => mudarStatus('concluído')}
                >
                    <Text style={styles.buttonText}>CONCLUIR</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 20 },
    center: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
    errorText: { color: COLORS.textSecondary, fontSize: 16 },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 14,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        color: COLORS.primaryCyan,
        marginTop: 16,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 6,
    },
    statusText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.8 },
    valueText: { fontSize: 16, color: COLORS.textPrimary, marginTop: 6, lineHeight: 22 },
    photo: { width: '100%', height: 220, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: COLORS.cardBorder },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12, color: COLORS.textPrimary, letterSpacing: 0.5 },
    buttonGroup: { flexDirection: 'row', gap: 12 },
    button: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    inProgressButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: COLORS.primaryCyan,
    },
    doneButton: {
        backgroundColor: COLORS.neonGreen,
    },
    buttonText: { color: '#000', fontWeight: '900', fontSize: 13, letterSpacing: 0.8 },
});