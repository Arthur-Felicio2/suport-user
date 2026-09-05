import React, { useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { callService } from '../services/callService';
import { COLORS } from '../theme/colors';

export default function NewCallScreen({ navigation }: any) {
    const [description, setDescription] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [address, setAddress] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    async function handleTakePhoto() {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permissão negada', 'Precisamos de acesso à câmera.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    }

    async function handlePickFromGallery() {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permissão negada', 'Precisamos acessar suas fotos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    }

    async function handleGetLocation() {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permissão negada', 'Precisamos da localização.');
            return;
        }

        setLoadingLocation(true);

        try {
            const gpsAtivo = await Location.hasServicesEnabledAsync();
            if (!gpsAtivo) {
                Alert.alert('GPS desligado', 'Ative o GPS do aparelho e tente novamente.');
                return;
            }

            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const [local] = await Location.reverseGeocodeAsync({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            });

            if (local) {
                const enderecoFormatado = `${local.street ?? 'Rua não identificada'}, ${local.city ?? ''} - ${local.region ?? ''}`;
                setAddress(enderecoFormatado);
            } else {
                setAddress('Endereço não encontrado.');
            }
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível obter a localização.');
        } finally {
            setLoadingLocation(false);
        }
    }

    async function handleCreateCall() {
        if (!description.trim()) return;

        setSaving(true);
        try {
            await callService.criarChamado({
                description,
                photoUri,
                address,
            });
            Alert.alert('Sucesso', 'Chamado registrado com sucesso!');
            setDescription('');
            setPhotoUri(null);
            setAddress(null);
            navigation.navigate('CallList');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível salvar o chamado.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Novo Chamado</Text>

            <Text style={styles.label}>Descrição do Problema *</Text>
            <TextInput
                style={styles.input}
                placeholder="Ex.: Monitor piscando ou sem sinal..."
                placeholderTextColor={COLORS.placeholder}
                value={description}
                onChangeText={setDescription}
                multiline
            />

            <Text style={styles.label}>Foto do Equipamento</Text>

            {photoUri ? (
                <View style={styles.photoContainer}>
                    <Image source={{ uri: photoUri }} style={styles.photo} />
                    <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.removeButton}>
                        <Text style={styles.removeButtonText}>Remover Foto</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>Nenhuma imagem anexada</Text>
                </View>
            )}

            <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.button, styles.cameraButton]} onPress={handleTakePhoto}>
                    <Text style={styles.buttonText}>📷 CÂMERA</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.galleryButton]} onPress={handlePickFromGallery}>
                    <Text style={styles.buttonText}>🖼️ GALERIA</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.label}>Localização do Atendimento</Text>
            <View style={styles.locationContainer}>
                {loadingLocation ? (
                    <Text style={styles.placeholderText}>Obtendo coordenadas...</Text>
                ) : address ? (
                    <Text style={styles.addressText}>📍 {address}</Text>
                ) : (
                    <Text style={styles.placeholderText}>Nenhuma localização capturada</Text>
                )}
            </View>

            <TouchableOpacity
                style={[styles.button, styles.locationButton]}
                onPress={handleGetLocation}
                disabled={loadingLocation}
            >
                <Text style={styles.buttonText}>
                    {loadingLocation ? 'OBTENDO...' : 'OBTER LOCALIZAÇÃO GPS'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.confirmButton,
                    (!description.trim() || saving) && styles.disabledButton,
                ]}
                disabled={!description.trim() || saving}
                onPress={handleCreateCall}
            >
                <Text style={styles.confirmButtonText}>
                    {saving ? 'SALVANDO...' : 'CRIAR CHAMADO'}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 20, paddingBottom: 50 },
    title: { fontSize: 26, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 20, letterSpacing: 0.5 },
    label: { fontSize: 12, fontWeight: '800', color: COLORS.primaryCyan, marginTop: 18, marginBottom: 8, letterSpacing: 1 },
    input: {
        backgroundColor: COLORS.cardBg,
        borderColor: COLORS.cardBorder,
        borderWidth: 1,
        borderRadius: 10,
        color: COLORS.textPrimary,
        padding: 14,
        minHeight: 90,
        textAlignVertical: 'top',
        fontSize: 15,
    },
    placeholder: {
        height: 140,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        borderStyle: 'dashed',
        backgroundColor: COLORS.cardBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: { color: COLORS.placeholder, fontSize: 14 },
    photoContainer: { alignItems: 'center' },
    photo: { width: '100%', height: 200, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primaryCyan },
    removeButton: { marginTop: 8, padding: 4 },
    removeButtonText: { color: COLORS.danger, fontWeight: '800', fontSize: 13 },
    buttonRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
    button: { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    cameraButton: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.primaryCyan },
    galleryButton: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.secondaryPink },
    locationContainer: {
        backgroundColor: COLORS.cardBg,
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        marginBottom: 10,
    },
    addressText: { color: COLORS.textPrimary, fontSize: 14 },
    locationButton: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.accentPurple },
    confirmButton: {
        backgroundColor: COLORS.primaryCyan,
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 28,
        shadowColor: COLORS.primaryCyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 6,
    },
    disabledButton: { opacity: 0.4 },
    buttonText: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 12, letterSpacing: 0.8 },
    confirmButtonText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
});