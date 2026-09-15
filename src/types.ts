export type ScheduleItem = {
  id: string;
  subject: string;
  room: string;
  startTime: string; // ISO string for the exact datetime
  endTime: string;   // ISO string for the exact datetime
  colorIndex: number;
};
