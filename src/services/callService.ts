import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { db, ALUNO_ID } from '../firebase/config';

export interface Chamado {
    id?: string;
    description: string;
    photoUri?: string | null;
    address?: string | null;
    status: string;
    criadoEm?: any;
    slaNotificationId?: string;
}

const getChamadosRef = () => collection(db, 'alunos', ALUNO_ID, 'chamados');

export const callService = {
    async listarChamados(): Promise<Chamado[]> {
        const q = query(getChamadosRef(), orderBy('criadoEm', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Chamado));
    },

    async buscarPorId(id: string): Promise<Chamado | null> {
        const docRef = doc(db, 'alunos', ALUNO_ID, 'chamados', id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as Chamado;
        }
        return null;
    },

    async atualizarStatus(id: string, novoStatus: string): Promise<void> {
        const docRef = doc(db, 'alunos', ALUNO_ID, 'chamados', id);
        await updateDoc(docRef, { status: novoStatus });
    },

    async salvarSlaNotificationId(id: string, slaNotificationId: string): Promise<void> {
        const docRef = doc(db, 'alunos', ALUNO_ID, 'chamados', id);
        await updateDoc(docRef, { slaNotificationId });
    },

    async criarChamado(dados: Omit<Chamado, 'id' | 'status' | 'criadoEm'>): Promise<string> {
        const docRef = await addDoc(getChamadosRef(), {
            ...dados,
            status: 'aberto',
            criadoEm: serverTimestamp(),
        });
        return docRef.id;
    },
};