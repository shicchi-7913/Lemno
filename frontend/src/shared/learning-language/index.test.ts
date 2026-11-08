import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  save: vi.fn(),
  isTauri: vi.fn(() => true),
}));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: storage.isTauri }));
vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn(async () => storage) }));

import { changeLearningLanguage, getLearningLanguage, initLearningLanguage } from './index';

beforeEach(() => {
  vi.resetAllMocks();
  storage.isTauri.mockReturnValue(true);
});

describe('learning language', () => {
  it('defaults to English and restores the saved learning language independently of the locale', async () => {
    storage.get.mockResolvedValue(undefined);
    await initLearningLanguage();
    expect(getLearningLanguage()).toBe('en');

    storage.get.mockResolvedValue('ja');
    await initLearningLanguage();
    expect(getLearningLanguage()).toBe('ja');
    expect(storage.get).toHaveBeenLastCalledWith('language');
  });

  it('publishes a new selection only after it is saved', async () => {
    storage.get.mockResolvedValue('en');
    await initLearningLanguage();
    let finish!: () => void;
    storage.save.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );

    const change = changeLearningLanguage('ja');
    await vi.waitFor(() => expect(storage.save).toHaveBeenCalled());
    expect(getLearningLanguage()).toBe('en');
    finish();
    await change;
    expect(getLearningLanguage()).toBe('ja');
    expect(storage.set).toHaveBeenCalledWith('language', 'ja');
  });

  it('keeps the previous learning language when persistence fails and allows retrying', async () => {
    storage.get.mockResolvedValue('en');
    await initLearningLanguage();
    storage.save.mockRejectedValueOnce(new Error('disk full'));

    await expect(changeLearningLanguage('ja')).rejects.toThrow('disk full');
    expect(getLearningLanguage()).toBe('en');
    await changeLearningLanguage('ja');
    expect(getLearningLanguage()).toBe('ja');
  });
});
