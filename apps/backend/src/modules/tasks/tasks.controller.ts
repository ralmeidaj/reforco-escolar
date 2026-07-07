import {
  Controller, Get, Post, Patch, Delete, Body, Param, Request,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateStudyLogDto } from './dto/create-study-log.dto';
import { CreateActivitySubmissionDto } from './dto/create-activity-submission.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('tasks')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Create a task for a student' })
  @ApiResponse({ status: 201, description: 'Task created' })
  createTask(@Request() req: any, @Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(req.tenant.id, req.user.sub, dto);
  }

  @Get('tasks/student/:studentId')
  @ApiOperation({ summary: 'List tasks for a student' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  findByStudent(@Request() req: any, @Param('studentId') studentId: string) {
    return this.tasksService.findTasksByStudent(req.tenant.id, studentId);
  }

  @Get('tasks/me')
  @Roles('student')
  @ApiOperation({ summary: 'List tasks for the authenticated student' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  findMyTasks(@Request() req: any) {
    return this.tasksService.findTasksByStudent(req.tenant.id, req.user.sub);
  }

  @Get('tasks/teacher')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'List tasks created by the authenticated teacher' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  findTeacherTasks(@Request() req: any) {
    return this.tasksService.findTasksByTeacher(req.tenant.id, req.user.sub);
  }

  @Patch('tasks/:id')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Update task metadata' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  updateTask(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.updateTask(req.tenant.id, id, dto);
  }

  @Patch('tasks/:id/done')
  @Roles('student')
  @ApiOperation({ summary: 'Mark a task as done (student only)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Task marked done' })
  markDone(@Request() req: any, @Param('id') id: string) {
    return this.tasksService.markDone(req.tenant.id, id, req.user.sub);
  }

  @Delete('tasks/:id')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204, description: 'Task deleted' })
  async deleteTask(@Request() req: any, @Param('id') id: string) {
    await this.tasksService.deleteTask(req.tenant.id, id);
  }

  @Post('study-logs')
  @Roles('student')
  @ApiOperation({ summary: 'Create a study log entry' })
  @ApiResponse({ status: 201, description: 'Study log created' })
  createStudyLog(@Request() req: any, @Body() dto: CreateStudyLogDto) {
    return this.tasksService.createStudyLog(req.tenant.id, req.user.sub, dto);
  }

  @Get('study-logs/student/:studentId')
  @ApiOperation({ summary: 'List study logs for a student' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200, description: 'List of study logs' })
  findStudyLogs(@Request() req: any, @Param('studentId') studentId: string) {
    return this.tasksService.findStudyLogsByStudent(req.tenant.id, studentId);
  }

  @Get('study-logs/me')
  @Roles('student')
  @ApiOperation({ summary: 'List study logs for the authenticated student' })
  @ApiResponse({ status: 200, description: 'List of study logs' })
  findMyStudyLogs(@Request() req: any) {
    return this.tasksService.findStudyLogsByStudent(req.tenant.id, req.user.sub);
  }

  @Post('activity-submissions')
  @Roles('student')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit an activity file (photo or PDF)' })
  @ApiResponse({ status: 201, description: 'Submission saved' })
  async submitActivity(
    @Request() req: any,
    @Body() dto: CreateActivitySubmissionDto,
    @UploadedFile() file: any,
  ) {
    const fileUrl = file ? `/uploads/${file.filename}` : 'stub://no-r2';
    const fileType = file?.mimetype ?? null;
    return this.tasksService.createActivitySubmission(req.tenant.id, req.user.sub, dto, fileUrl, fileType ?? undefined);
  }

  @Get('activity-submissions/task/:taskId')
  @ApiOperation({ summary: 'List submissions for a task' })
  @ApiParam({ name: 'taskId', type: 'string' })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  findSubmissions(@Request() req: any, @Param('taskId') taskId: string) {
    return this.tasksService.findSubmissionsByTask(req.tenant.id, taskId);
  }
}
