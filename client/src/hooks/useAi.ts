import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAiSettings, saveAiSettings, sendChat, testAiConnection } from "../api/ai.api";
import type { AiSettingsInput } from "../types/api";
import { useOwnQuery, useUnauthorizedHandler } from "./useOwnQuery";

export const useAiChat = () => useMutation({ mutationFn: sendChat });

export const useAiSettings = () => useOwnQuery("owner", ["ai-settings"], getAiSettings, { staleTime: 0 });

export function useSaveAiSettings() {
  const queryClient = useQueryClient();
  const onUnauthorized = useUnauthorizedHandler();
  return useMutation({
    mutationFn: (input: AiSettingsInput) => saveAiSettings(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["owner", "ai-settings"] }),
    onError: onUnauthorized,
  });
}

export function useTestAiConnection() {
  const onUnauthorized = useUnauthorizedHandler();
  return useMutation({ mutationFn: testAiConnection, onError: onUnauthorized });
}
