import { invoke } from '@tauri-apps/api/core';

interface CodexStatus {
  registered: boolean;
  current: boolean;
}

export const mcpApi = {
  status: () => invoke<CodexStatus>('get_codex_status'),
  connect: () => invoke<CodexStatus>('connect_codex'),
};
