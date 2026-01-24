import { IsUUID, IsNotEmpty } from 'class-validator';

export class AssignUserToProjectDto {
    @IsUUID()
    @IsNotEmpty()
    userId: string;

    @IsUUID()
    @IsNotEmpty()
    projectId: string;

    @IsUUID()
    @IsNotEmpty()
    roleId: string;
}
