export async function getAddReadingTimeToTitle(): Promise<boolean> {
  const { addReadingTimeToTitle = true } = await chrome.storage.sync.get<{
    addReadingTimeToTitle: boolean;
  }>({ addReadingTimeToTitle: true });
  return addReadingTimeToTitle;
}

export async function setAddReadingTimeToTitle(
  enabled: boolean,
): Promise<void> {
  await chrome.storage.sync.set({ addReadingTimeToTitle: enabled });
}
