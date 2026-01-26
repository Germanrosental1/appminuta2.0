
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class UifAuthGuard extends AuthGuard('uif-jwt') { }
