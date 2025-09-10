from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Post, Comment, Like, Follow, Story, Conversation, Message, Notification

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'followers_count', 'following_count', 'posts_count')
    fieldsets = UserAdmin.fieldsets + (
        ('Profile Info', {'fields': ('bio', 'profile_picture', 'website', 'phone_number', 'is_private')}),
        ('Stats', {'fields': ('followers_count', 'following_count', 'posts_count')}),
    )

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('user', 'caption', 'likes_count', 'comments_count', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'caption')

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('user', 'post', 'text', 'likes_count', 'created_at')
    list_filter = ('created_at',)

@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ('follower', 'following', 'created_at')

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'is_group', 'group_name', 'admin', 'created_at')
    filter_horizontal = ('participants',)

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'conversation', 'text', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')

admin.site.register(Like)
admin.site.register(Story)
admin.site.register(Notification)
