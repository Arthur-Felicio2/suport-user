import React, { useState, useCallback } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { callService, Chamado } from '../services/callService';
import { COLORS } from '../theme/colors';

export default function CallListScreen({ navigation }: any) {
    const [chamados, setChamados] = useState<Chamado[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            let ativo = true;

            async function carregar() {
                setLoading(true);
                try {
                    const lista = await callService.listarChamados();
                    if (ativo) setChamados(lista);
                } catch (error) {
                    console.log('Erro ao carregar chamados:', error);
                } finally {
                    if (ativo) setLoading(false);
                }
            }

            carregar();
            return () => { ativo = false; };
        }, [])
    );

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

    return (
        <View style={styles.screen}>
            <Text style={styles.headerTitle}>Chamados de Suporte</Text>

            <FlatList
                data={chamados}
                keyExtractor={(item) => item.id!}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Nenhum chamado registrado ainda</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const statusColor = getStatusColor(item.status);
                    return (
                        <TouchableOpacity
                            style={[styles.card, { borderColor: statusColor + '40' }]}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('CallDetail', { chamadoId: item.id })}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle} numberOfLines={2}>
                                    {item.description}
                                </Text>
                            </View>

                            <View style={styles.cardFooter}>
                                <View style={[styles.badge, { borderColor: statusColor, backgroundColor: statusColor + '1A' }]}>
                                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                    <Text style={[styles.badgeText, { color: statusColor }]}>
                                        {item.status.toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={styles.arrowText}>→</Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />

            <TouchableOpacity
                style={styles.newButton}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('NewCall')}
            >
                <Text style={styles.newButtonText}>+ NOVO CHAMADO</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16, paddingTop: 20 },
    center: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16, letterSpacing: 0.5 },
    list: { paddingBottom: 100 },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: COLORS.textSecondary, fontSize: 15 },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        shadowColor: COLORS.primaryCyan,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    cardHeader: { marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 22 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
    arrowText: { fontSize: 18, color: COLORS.textSecondary, fontWeight: 'bold' },
    newButton: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        backgroundColor: COLORS.primaryCyan,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: COLORS.primaryCyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 6,
    },
    newButtonText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
});