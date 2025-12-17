export async function sendChatMessage(prompt) {
  // For now, return a dummy response
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        "This is the conflict resolution coach 🤝 — I'll help you understand emotions, communication strategies, and peaceful solutions!"
      );
    }, 800);
  });
}
