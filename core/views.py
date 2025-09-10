from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from .models import User, Post, Comment, Like, Follow, Conversation, Message, Notification, CommentLike
import json

def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect('core:home')
        else:
            messages.error(request, 'Invalid credentials')
    return render(request, 'auth/login.html')

def register_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        email = request.POST['email']
        password = request.POST['password']
        
        if User.objects.filter(username=username).exists():
            messages.error(request, 'Username already exists')
        elif User.objects.filter(email=email).exists():
            messages.error(request, 'Email already exists')
        else:
            user = User.objects.create_user(username=username, email=email, password=password)
            login(request, user)
            return redirect('core:home')
    return render(request, 'auth/register.html')

def logout_view(request):
    logout(request)
    return redirect('core:login')

@login_required
def home(request):
    # Get posts from followed users
    following_users = Follow.objects.filter(follower=request.user).values_list('following', flat=True)
    posts = Post.objects.filter(Q(user__in=following_users) | Q(user=request.user))
    
    # Get suggested users
    suggested_users = User.objects.exclude(
        Q(id=request.user.id) | 
        Q(id__in=following_users)
    )[:5]
    
    context = {
        'posts': posts,
        'suggested_users': suggested_users,
    }
    return render(request, 'core/home.html', context)

@login_required
def explore(request):
    posts = Post.objects.all()
    return render(request, 'core/explore.html', {'posts': posts})

@login_required
def profile(request, username):
    user = get_object_or_404(User, username=username)
    posts = Post.objects.filter(user=user)
    is_following = Follow.objects.filter(follower=request.user, following=user).exists()
    
    context = {
        'profile_user': user,
        'posts': posts,
        'is_following': is_following,
    }
    return render(request, 'core/profile.html', context)

@login_required
def edit_profile(request):
    if request.method == 'POST':
        user = request.user
        user.first_name = request.POST.get('first_name', '')
        user.bio = request.POST.get('bio', '')
        user.website = request.POST.get('website', '')
        
        if 'profile_picture' in request.FILES:
            user.profile_picture = request.FILES['profile_picture']
        
        user.save()
        messages.success(request, 'Profile updated successfully')
        return redirect('core:profile', username=user.username)
    
    return render(request, 'core/edit_profile.html')

@login_required
def create_post(request):
    if request.method == 'POST':
        caption = request.POST.get('caption', '')
        image = request.FILES.get('image')
        
        if image:
            post = Post.objects.create(user=request.user, caption=caption, image=image)
            request.user.posts_count += 1
            request.user.save()
            return redirect('core:home')
        else:
            messages.error(request, 'Please select an image')
    
    return render(request, 'core/create_post.html')

@login_required
def post_detail(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    comments = Comment.objects.filter(post=post)
    return render(request, 'core/post_detail.html', {'post': post, 'comments': comments})

from django.contrib.auth.decorators import login_required
from django.db.models import Q, Count, Exists, OuterRef

@login_required
def messages_view(request):
    conversations = Conversation.objects.filter(participants=request.user).order_by('-updated_at')
    
    # Annotate each conversation with whether it has unread messages from others
    for conversation in conversations:
        has_unread = conversation.messages.filter(
            is_read=False,
            sender__ne=request.user
        ).exists()
        conversation.has_unread = has_unread  # Add as an attribute for template use
    
    return render(request, 'core/messages.html', {'conversations': conversations})

@login_required
def conversation_detail(request, conversation_id):
    conversation = get_object_or_404(Conversation, id=conversation_id, participants=request.user)
    messages = Message.objects.filter(conversation=conversation)
    
    if conversation.is_group:
        return render(request, 'core/group_detail.html', {
            'conversation': conversation,
            'messages': messages
        })
    else:
        return render(request, 'core/conversation_detail.html', {
            'conversation': conversation,
            'messages': messages
        })

@login_required
def create_group(request):
    if request.method == 'POST':
        group_name = request.POST.get('group_name')
        participant_usernames = request.POST.getlist('participants')
        
        conversation = Conversation.objects.create(
            is_group=True,
            group_name=group_name,
            admin=request.user
        )
        
        conversation.participants.add(request.user)
        for username in participant_usernames:
            try:
                user = User.objects.get(username=username)
                conversation.participants.add(user)
            except User.DoesNotExist:
                pass
        
        return redirect('core:conversation_detail', conversation_id=conversation.id)
    
    users = User.objects.exclude(id=request.user.id)
    return render(request, 'core/create_group.html', {'users': users})

# AJAX Views
@csrf_exempt
@login_required
def like_post(request):
    if request.method == 'POST':
        post_id = request.POST.get('post_id')
        post = get_object_or_404(Post, id=post_id)
        
        like, created = Like.objects.get_or_create(user=request.user, post=post)
        
        if not created:
            like.delete()
            post.likes_count -= 1
            liked = False
        else:
            post.likes_count += 1
            liked = True
            
            if post.user != request.user:
                Notification.objects.create(
                    user=post.user,
                    from_user=request.user,
                    notification_type='like',
                    post=post
                )
        
        post.save()
        
        return JsonResponse({
            'success': True,
            'liked': liked,
            'likes_count': post.likes_count
        })

@csrf_exempt
@login_required
def follow_user(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        user_to_follow = get_object_or_404(User, username=username)
        
        if user_to_follow == request.user:
            return JsonResponse({'success': False, 'error': 'Cannot follow yourself'})
        
        follow, created = Follow.objects.get_or_create(
            follower=request.user,
            following=user_to_follow
        )
        
        if not created:
            follow.delete()
            user_to_follow.followers_count -= 1
            request.user.following_count -= 1
            following = False
        else:
            user_to_follow.followers_count += 1
            request.user.following_count += 1
            following = True
            
            Notification.objects.create(
                user=user_to_follow,
                from_user=request.user,
                notification_type='follow'
            )
        
        user_to_follow.save()
        request.user.save()
        
        return JsonResponse({
            'success': True,
            'following': following,
            'followers_count': user_to_follow.followers_count
        })

@csrf_exempt
@login_required
def add_comment(request):
    if request.method == 'POST':
        post_id = request.POST.get('post_id')
        text = request.POST.get('text')
        
        if not text.strip():
            return JsonResponse({'success': False, 'error': 'Comment cannot be empty'})
        
        post = get_object_or_404(Post, id=post_id)
        comment = Comment.objects.create(user=request.user, post=post, text=text.strip())
        
        post.comments_count += 1
        post.save()
        
        if post.user != request.user:
            Notification.objects.create(
                user=post.user,
                from_user=request.user,
                notification_type='comment',
                post=post,
                comment=comment
            )
        
        return JsonResponse({
            'success': True,
            'comment': {
                'id': comment.id,
                'username': comment.user.username,
                'text': comment.text,
                'created_at': comment.created_at.strftime('%Y-%m-%d %H:%M'),
                'user_avatar': comment.user.profile_picture.url if comment.user.profile_picture else None
            }
        })

@csrf_exempt
@login_required
def save_post(request):
    if request.method == 'POST':
        post_id = request.POST.get('post_id')
        post = get_object_or_404(Post, id=post_id)
        
        # This would require a SavedPost model, but for demo we'll simulate
        # In a real app, you'd create a SavedPost model
        saved = not hasattr(request.user, '_saved_posts')  # Simulate toggle
        
        return JsonResponse({
            'success': True,
            'saved': saved
        })

@csrf_exempt
@login_required
def like_comment(request):
    if request.method == 'POST':
        comment_id = request.POST.get('comment_id')
        comment = get_object_or_404(Comment, id=comment_id)
        
        like, created = CommentLike.objects.get_or_create(user=request.user, comment=comment)
        
        if not created:
            like.delete()
            comment.likes_count -= 1
            liked = False
        else:
            comment.likes_count += 1
            liked = True
        
        comment.save()
        
        return JsonResponse({
            'success': True,
            'liked': liked,
            'likes_count': comment.likes_count
        })

@csrf_exempt
@login_required
def search_users(request):
    if request.method == 'POST':
        query = request.POST.get('query', '').strip()
        
        if len(query) < 2:
            return JsonResponse({'results': []})
        
        users = User.objects.filter(
            Q(username__icontains=query) | 
            Q(first_name__icontains=query) | 
            Q(last_name__icontains=query)
        ).exclude(id=request.user.id)[:10]
        
        results = []
        for user in users:
            results.append({
                'username': user.username,
                'full_name': user.get_full_name(),
                'profile_picture': user.profile_picture.url if user.profile_picture else None
            })
        
        return JsonResponse({'results': results})

@csrf_exempt
@login_required
def send_message(request):
    if request.method == 'POST':
        conversation_id = request.POST.get('conversation_id')
        text = request.POST.get('text')
        
        if not text.strip():
            return JsonResponse({'success': False, 'error': 'Message cannot be empty'})
        
        conversation = get_object_or_404(Conversation, id=conversation_id, participants=request.user)
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            text=text.strip()
        )
        
        conversation.save()  # Updates updated_at
        
        # Create notifications for other participants
        for participant in conversation.participants.exclude(id=request.user.id):
            Notification.objects.create(
                user=participant,
                from_user=request.user,
                notification_type='message'
            )
        
        return JsonResponse({
            'success': True,
            'message': {
                'id': message.id,
                'sender': message.sender.username,
                'text': message.text,
                'created_at': message.created_at.strftime('%H:%M')
            }
        })

@csrf_exempt
@login_required
def create_conversation(request):
    if request.method == 'POST':
        participant_usernames = request.POST.getlist('participants')
        
        if not participant_usernames:
            return JsonResponse({'success': False, 'error': 'No participants selected'})
        
        # Check if conversation already exists for these participants
        participants = [request.user]
        for username in participant_usernames:
            try:
                user = User.objects.get(username=username)
                participants.append(user)
            except User.DoesNotExist:
                continue
        
        if len(participants) < 2:
            return JsonResponse({'success': False, 'error': 'Invalid participants'})
        
        # For 1-on-1 conversations, check if it already exists
        if len(participants) == 2:
            existing_conversation = Conversation.objects.filter(
                is_group=False,
                participants__in=participants
            ).annotate(
                participant_count=models.Count('participants')
            ).filter(participant_count=2).first()
            
            if existing_conversation:
                return JsonResponse({
                    'success': True,
                    'conversation_id': existing_conversation.id
                })
        
        # Create new conversation
        conversation = Conversation.objects.create(
            is_group=len(participants) > 2
        )
        
        for participant in participants:
            conversation.participants.add(participant)
        
        return JsonResponse({
            'success': True,
            'conversation_id': conversation.id
        })

# Group management AJAX views
@csrf_exempt
@login_required
def remove_group_member(request):
    if request.method == 'POST':
        conversation_id = request.POST.get('conversation_id')
        username = request.POST.get('username')
        
        conversation = get_object_or_404(Conversation, id=conversation_id, is_group=True)
        
        # Check if user is admin
        if conversation.admin != request.user:
            return JsonResponse({'success': False, 'error': 'Only admin can remove members'})
        
        try:
            user_to_remove = User.objects.get(username=username)
            
            # Cannot remove admin
            if user_to_remove == conversation.admin:
                return JsonResponse({'success': False, 'error': 'Cannot remove admin'})
            
            conversation.participants.remove(user_to_remove)
            
            # Send system message
            Message.objects.create(
                conversation=conversation,
                sender=request.user,
                text=f"{user_to_remove.username} was removed from the group"
            )
            
            return JsonResponse({'success': True})
            
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'User not found'})

@csrf_exempt
@login_required
def leave_group(request):
    if request.method == 'POST':
        conversation_id = request.POST.get('conversation_id')
        
        conversation = get_object_or_404(Conversation, id=conversation_id, is_group=True, participants=request.user)
        
        # If admin is leaving, transfer admin to another member or delete group
        if conversation.admin == request.user:
            other_participants = conversation.participants.exclude(id=request.user.id)
            if other_participants.exists():
                conversation.admin = other_participants.first()
                conversation.save()
            else:
                # Last member leaving, delete the group
                conversation.delete()
                return JsonResponse({'success': True})
        
        conversation.participants.remove(request.user)
        
        # Send system message
        Message.objects.create(
            conversation=conversation,
            sender=request.user,
            text=f"{request.user.username} left the group"
        )
        
        return JsonResponse({'success': True})

@csrf_exempt
@login_required
def delete_group(request):
    if request.method == 'POST':
        conversation_id = request.POST.get('conversation_id')
        
        conversation = get_object_or_404(Conversation, id=conversation_id, is_group=True)
        
        # Check if user is admin
        if conversation.admin != request.user:
            return JsonResponse({'success': False, 'error': 'Only admin can delete group'})
        
        conversation.delete()
        return JsonResponse({'success': True})

@csrf_exempt
@login_required
def add_group_members(request):
    if request.method == 'POST':
        conversation_id = request.POST.get('conversation_id')
        usernames = request.POST.getlist('usernames')
        
        conversation = get_object_or_404(Conversation, id=conversation_id, is_group=True)
        
        # Check if user is admin
        if conversation.admin != request.user:
            return JsonResponse({'success': False, 'error': 'Only admin can add members'})
        
        added_users = []
        for username in usernames:
            try:
                user = User.objects.get(username=username)
                if not conversation.participants.filter(id=user.id).exists():
                    conversation.participants.add(user)
                    added_users.append(user.username)
            except User.DoesNotExist:
                continue
        
        if added_users:
            # Send system message
            Message.objects.create(
                conversation=conversation,
                sender=request.user,
                text=f"{', '.join(added_users)} {'was' if len(added_users) == 1 else 'were'} added to the group"
            )
        
        return JsonResponse({
            'success': True,
            'added_users': added_users
        })

@csrf_exempt
@login_required
def search_users_for_group(request):
    if request.method == 'POST':
        query = request.POST.get('query', '').strip()
        conversation_id = request.POST.get('conversation_id')
        
        if len(query) < 2:
            return JsonResponse({'users': []})
        
        # Get current group members to exclude them
        conversation = get_object_or_404(Conversation, id=conversation_id, is_group=True)
        current_members = conversation.participants.all()
        
        users = User.objects.filter(
            Q(username__icontains=query) | 
            Q(first_name__icontains=query) | 
            Q(last_name__icontains=query)
        ).exclude(id__in=current_members.values_list('id', flat=True))[:10]
        
        results = []
        for user in users:
            results.append({
                'username': user.username,
                'full_name': user.get_full_name(),
                'profile_picture': user.profile_picture.url if user.profile_picture else None
            })
        
        return JsonResponse({'users': results})
