export interface ScheduleItem {
  id: string;
  subject: string;
  room?: string;
  colorIndex: number;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  personId?: string;
  seriesId?: string;
}
