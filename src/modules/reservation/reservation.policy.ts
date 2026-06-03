import { ReservationStatus } from "@prisma/client";

export class ReservationPolicy {
  static getDurationMs(): number {
    const minutes = Number(process.env.DEFAULT_RESERVATION_DURATION_MINUTES) || 120;
    return minutes * 60 * 1000;
  }

  static readonly validTransitions: Record<ReservationStatus, ReservationStatus[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["SEATED", "CANCELLED", "NO_SHOW"],
    SEATED: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
    NO_SHOW: [],
  };

  static canTransition(currentStatus: ReservationStatus, newStatus: ReservationStatus): boolean {
    return this.validTransitions[currentStatus].includes(newStatus);
  }
}
