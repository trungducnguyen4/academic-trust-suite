import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListTopicsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateTopicDto {
  @IsString()
  code: string;

  @IsString()
  name: string;
}

export class SetCourseTopicsDto {
  @IsArray()
  @IsString({ each: true })
  topicIds: string[];
}
