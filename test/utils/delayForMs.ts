export const delayForMs = (delayMs): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), delayMs);
  });
};

export default delayForMs;
