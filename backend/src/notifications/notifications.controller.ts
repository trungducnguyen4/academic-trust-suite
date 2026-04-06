import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";
import { PaginationDto } from "../common/dto/pagination.dto";

@ApiTags("Notifications")
@ApiBearerAuth("access-token")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("my")
  getMyNotifications(
    @Request() req,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("unreadOnly") unreadOnly?: string,
  ) {
    const pagination: PaginationDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    return this.notificationsService.findMyNotifications(
      req.user.id,
      pagination,
      unreadOnly === "true",
    );
  }

  @Get("unread-count")
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Patch(":id/read")
  markAsRead(@Param("id") id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch("read-all")
  markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Request() req) {
    return this.notificationsService.remove(id, req.user.id);
  }
}
