import { Controller, Get, Post, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Progress')
@ApiBearerAuth()
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post()
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Upsert student progress for a subject' })
  @ApiResponse({ status: 201, description: 'Progress saved' })
  upsert(@Request() req: any, @Body() dto: UpdateProgressDto) {
    return this.progressService.upsert(req.tenant.id, dto);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Get all progress entries for a student' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200, description: 'List of progress entries' })
  findByStudent(@Request() req: any, @Param('studentId') studentId: string) {
    return this.progressService.findByStudent(req.tenant.id, studentId);
  }

  @Get('student/:studentId/subject/:subjectId')
  @ApiOperation({ summary: 'Get progress for a specific student/subject pair' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiParam({ name: 'subjectId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Progress entry or null' })
  findOne(@Request() req: any, @Param('studentId') studentId: string, @Param('subjectId') subjectId: string) {
    return this.progressService.findByStudentAndSubject(req.tenant.id, studentId, subjectId);
  }
}
