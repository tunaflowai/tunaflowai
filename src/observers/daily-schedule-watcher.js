export class DailyScheduleWatcher {
  constructor({ hour = 23, minute = 0, eventType = 'schedule.daily_close' } = {}) {
    this.hour = hour;
    this.minute = minute;
    this.eventType = eventType;
    this.timer = null;
  }
  start(emit) {
    const tick = async () => {
      const now = new Date();
      if (now.getHours() === this.hour && now.getMinutes() === this.minute) await emit({ type: this.eventType, priority: 'high', text: 'Daily scheduled workflow triggered.' });
      this.timer = setTimeout(tick, 60 * 1000);
    };
    tick();
  }
  stop() { if (this.timer) clearTimeout(this.timer); }
}
