import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kairos-quiz-user-id';

function randomSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getQuizUserId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEY);
  if (!id?.trim()) {
    id = `u-${randomSuffix()}`;
    await AsyncStorage.setItem(KEY, id);
  }
  return id;
}
