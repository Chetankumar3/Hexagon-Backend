// Notification broadcaster for WebSocket notifications
// This will be set by server.js after socket initialization
let notificationsSocket = null;

export const setNotificationsSocket = (socketHandler) => {
  notificationsSocket = socketHandler;
};

export const broadcastNotification = (userId, notification) => {
  if (notificationsSocket && notificationsSocket.sendNotification) {
    notificationsSocket.sendNotification(String(userId), notification);
  }
};

