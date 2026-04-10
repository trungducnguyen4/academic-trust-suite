/**
 * EXAMPLE: How to use the NotificationPopup system
 * 
 * The notification popup system allows you to show toast-like notifications
 * anywhere in the app that auto-close after a fixed duration.
 */

// 1. Use the hook in any component:
// import { useNotificationPopup } from '@/contexts/NotificationPopupContext';
//
// export function MyComponent() {
//   const { addNotification } = useNotificationPopup();
//
//   const handleSuccess = () => {
//     addNotification({
//       title: 'Success!',
//       message: 'Operation completed successfully',
//       type: 'success', // 'success' | 'info' | 'warning' | 'error'
//     });
//   };
//
//   return <button onClick={handleSuccess}>Click me</button>;
// }

// 2. Types of notifications:
// - 'success': Green success notification
// - 'info': Blue info notification (default)
// - 'warning': Yellow warning notification
// - 'error': Red error notification

// 3. Notification props:
// interface NotificationItem {
//   id?: string;                    // Auto-generated if not provided
//   title: string;                  // Main title of the notification
//   message: string;                // Description/message
//   type?: 'success' | 'info' | 'warning' | 'error';  // Notification type
//   timestamp?: Date;               // Optional timestamp (auto-set if not provided)
// }

// 4. NotificationPopupProps in the component:
// - notifications: NotificationItem[]           // Array of notifications to show
// - maxNotifications?: number = 3               // Max notifications to display at once
// - autoCloseDuration?: number = 5000           // Auto-close time in ms (0 = never)
// - onClose?: () => void                        // Callback when notifications close
// - position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right'

// 5. Features:
// - Auto-closes after 5 seconds by default
// - Smooth fade-out animation
// - Multiple notifications queue up (max 3 visible by default)
// - Can dismiss manually by clicking X button
// - Icons change based on type
// - Responsive design that works on mobile

// 6. Current integration points:
// - Login page: Shows "Welcome back!" + recent unread notifications
// - App.tsx: Global NotificationPopupContainer at top-right
// - Can be used anywhere by calling useNotificationPopup()

// 7. Example usage patterns:

// Pattern 1: Basic success message
// const { addNotification } = useNotificationPopup();
// addNotification({
//   title: 'User added',
//   message: 'John Doe has been enrolled in the course',
//   type: 'success',
// });

// Pattern 2: Error handling
// try {
//   await api.enrollStudent(studentId, courseId);
// } catch (error) {
//   addNotification({
//     title: 'Enrollment failed',
//     message: error.message,
//     type: 'error',
//   });
// }

// Pattern 3: Warning notification
// addNotification({
//   title: 'Attention',
//   message: 'The exam will start in 5 minutes',
//   type: 'warning',
// });

// Pattern 4: Info notification
// addNotification({
//   title: 'Info',
//   message: 'New course has been created',
//   type: 'info',
// });
