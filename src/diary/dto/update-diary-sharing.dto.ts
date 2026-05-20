import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateDiarySharingDto {
    @IsBoolean()
    @IsNotEmpty()
    shareDiaryWithProfessionals!: boolean;
}