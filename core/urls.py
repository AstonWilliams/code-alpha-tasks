from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    # Authentication
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    
    # Main pages
    path('', views.home, name='home'),
    path('explore/', views.explore, name='explore'),
    path('profile/<str:username>/', views.profile, name='profile'),
    path('edit-profile/', views.edit_profile, name='edit_profile'),
    path('settings/', views.settings, name='settings'),
    path('create-story/', views.create_story, name='create_story'),
    path('followers/<str:username>/', views.followers_list, name='followers_list'),
    path('following/<str:username>/', views.following_list, name='following_list'),
    
    # Posts
    path('create-post/', views.create_post, name='create_post'),
    path('post/<int:post_id>/', views.post_detail, name='post_detail'),
    
    # Messages
    path('messages/', views.messages_view, name='messages'),
    path('messages/<int:conversation_id>/', views.conversation_detail, name='conversation_detail'),
    path('create-group/', views.create_group, name='create_group'),
    
    # AJAX endpoints
    path('ajax/like-post/', views.like_post, name='like_post'),
    path('ajax/follow-user/', views.follow_user, name='follow_user'),
    path('ajax/add-comment/', views.add_comment, name='add_comment'),
    path('ajax/send-message/', views.send_message, name='send_message'),
    path('ajax/save-post/', views.save_post, name='save_post'),
    path('ajax/share-post/', views.share_post, name='share_post'),
    path('ajax/upload-progress/', views.upload_progress, name='upload_progress'),
    path('ajax/like-comment/', views.like_comment, name='like_comment'),
    path('ajax/search/', views.search_posts, name='search_posts'),
    path('ajax/search-users/', views.search_users, name='search_users'),
    path('ajax/create-conversation/', views.create_conversation, name='create_conversation'),
    path('ajax/suggested-users/', views.suggested_users, name='suggested_users'),
    
    # Group management AJAX endpoints
    path('ajax/remove-group-member/', views.remove_group_member, name='remove_group_member'),
    path('ajax/leave-group/', views.leave_group, name='leave_group'),
    path('ajax/delete-group/', views.delete_group, name='delete_group'),
    path('ajax/add-group-members/', views.add_group_members, name='add_group_members'),
    path('ajax/search-users-for-group/', views.search_users_for_group, name='search_users_for_group'),
]
