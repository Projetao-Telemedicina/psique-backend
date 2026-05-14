export class CanJoinResponseDto {
    canJoin!: boolean;
    meetLink!: string;
    startsAt!: Date;
    endsAt!: Date;
    minutesUntilStart!: number;
}