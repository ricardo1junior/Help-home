import { formatDateTime, listMessages, sendMessage, subscribeToMessages, type Message } from '@helphome/shared';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorText, Loading, Muted } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { toMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors, radius, space } from '@/lib/theme';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const list = useRef<FlatList<Message>>(null);

  useEffect(() => {
    const add = (m: Message) => setMessages((prev) => (prev?.some((x) => x.id === m.id) ? prev : [...(prev ?? []), m]));
    listMessages(supabase, id)
      .then(setMessages)
      .catch((err) => setError(toMessage(err)));
    return subscribeToMessages(supabase, id, add);
  }, [id]);

  async function send() {
    const body = text.trim();
    if (!body || !profile) return;
    setSending(true);
    try {
      const m = await sendMessage(supabase, profile.id, id, body);
      setMessages((prev) => (prev?.some((x) => x.id === m.id) ? prev : [...(prev ?? []), m]));
      setText('');
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (!messages && !error) return <Loading />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={list}
          data={messages ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: space.lg, gap: space.sm }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<Muted style={{ textAlign: 'center' }}>Nenhuma mensagem ainda. Combine os detalhes por aqui.</Muted>}
          renderItem={({ item }) => {
            const mine = item.sender_id === profile?.id;
            return (
              <View
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  backgroundColor: mine ? colors.brand : '#fff',
                  borderWidth: mine ? 0 : 1,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  paddingHorizontal: space.md,
                  paddingVertical: space.sm,
                }}>
                <Text style={{ color: mine ? '#fff' : colors.text, fontSize: 15 }}>{item.body}</Text>
                <Text style={{ color: mine ? '#ffedd5' : colors.muted, fontSize: 10, marginTop: 2, textAlign: 'right' }}>
                  {formatDateTime(item.created_at)}
                </Text>
              </View>
            );
          }}
        />
        <ErrorText message={error} />
        <View
          style={{
            flexDirection: 'row',
            gap: space.sm,
            padding: space.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: '#fff',
          }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Escreva uma mensagem"
            placeholderTextColor="#94a3b8"
            multiline
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#cbd5e1',
              borderRadius: radius.md,
              paddingHorizontal: space.md,
              paddingVertical: 10,
              maxHeight: 120,
              fontSize: 15,
              color: colors.text,
            }}
          />
          <Pressable
            accessibilityRole="button"
            onPress={send}
            disabled={sending || !text.trim()}
            style={{
              backgroundColor: colors.brand,
              borderRadius: radius.md,
              paddingHorizontal: space.lg,
              justifyContent: 'center',
              opacity: sending || !text.trim() ? 0.5 : 1,
            }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Enviar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
