// Main JavaScript functionality
document.addEventListener("DOMContentLoaded", () => {
  // Form validation
  const forms = document.querySelectorAll(".auth-form")
  forms.forEach((form) => {
    const inputs = form.querySelectorAll(".form-input")
    const submitBtn = form.querySelector(".btn-primary")

    function validateForm() {
      let isValid = true
      inputs.forEach((input) => {
        if (!input.value.trim()) {
          isValid = false
        }
      })

      if (submitBtn) {
        submitBtn.disabled = !isValid
      }
    }

    inputs.forEach((input) => {
      input.addEventListener("input", validateForm)
    })

    // Initial validation
    validateForm()
  })

  // Auto-hide alerts
  const alerts = document.querySelectorAll(".alert")
  alerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.opacity = "0"
      setTimeout(() => {
        alert.remove()
      }, 300)
    }, 5000)
  })

  initializeLikeStates()

  initializeFollowStates()

  setupCommentHandlers()

  setupDoubleTapLike()

  initializeMessaging()

  // Setup new message modal handlers
  const newMessageBtn = document.querySelector(".new-message-btn")
  if (newMessageBtn) {
    newMessageBtn.addEventListener("click", startNewConversation)
  }

  const closeModalBtn = document.querySelector(".close-modal")
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeNewMessageModal)
  }

  // Setup user search
  const userSearchInput = document.querySelector(".user-search-input")
  if (userSearchInput) {
    let searchTimeout
    userSearchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        searchUsers(e.target.value.trim())
      }, 300)
    })
  }

  // Close modal when clicking outside
  const modal = document.getElementById("newMessageModal")
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeNewMessageModal()
      }
    })
  }

  initializeVideoPlayersFunc()
  initializeUploadProgressFunc()
  initializeSettingsTabsFunc()
  initializeMobileNavigationFunc()
  setupShareFunctionalityFunc()

  // Touch gestures for mobile
  if ("ontouchstart" in window) {
    initializeTouchGesturesFunc()
  }

  // Handle image preview
  const imageInputs = document.querySelectorAll('input[type="file"][data-preview-container]')
  imageInputs.forEach((input) => {
    const previewContainerId = input.dataset.previewContainer
    const previewContainer = document.getElementById(previewContainerId)

    if (previewContainer) {
      input.addEventListener("change", () => {
        handleImagePreview(input, previewContainer)
      })
    }
  })
})

function initializeLikeStates() {
  // This would typically fetch from server, but for demo we'll use data attributes
  const likeBtns = document.querySelectorAll(".like-btn")
  likeBtns.forEach((btn) => {
    const postElement = btn.closest("[data-post-id]")
    if (postElement) {
      const isLiked = postElement.dataset.userLiked === "true"
      if (isLiked) {
        btn.classList.add("liked")
        const heartIcon = btn.querySelector("svg path")
        if (heartIcon) {
          heartIcon.setAttribute("fill", "#ed4956")
          heartIcon.setAttribute("stroke", "#ed4956")
        }
      }
    }
  })
}

function initializeFollowStates() {
  const followBtns = document.querySelectorAll(".follow-btn")
  followBtns.forEach((btn) => {
    const userElement = btn.closest("[data-username]")
    if (userElement) {
      const isFollowing = userElement.dataset.isFollowing === "true"
      if (isFollowing) {
        btn.textContent = "Following"
        btn.classList.add("following")
      }
    }
  })
}

function setupCommentHandlers() {
  const commentInputs = document.querySelectorAll(".comment-input")
  commentInputs.forEach((input) => {
    const postBtn = input.parentElement.querySelector(".post-comment-btn")

    // Enable/disable post button
    input.addEventListener("input", () => {
      if (input.value.trim()) {
        postBtn.classList.add("active")
      } else {
        postBtn.classList.remove("active")
      }
    })

    // Submit on Enter key
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        const postElement = input.closest("[data-post-id]")
        if (postElement) {
          const postId = postElement.dataset.postId
          addComment(postId, input.value.trim())
        }
      }
    })
  })
}

function setupDoubleTapLike() {
  const postImages = document.querySelectorAll(".post-image img, .detail-image")
  postImages.forEach((img) => {
    let tapCount = 0
    let tapTimer = null

    img.addEventListener("click", (e) => {
      tapCount++

      if (tapCount === 1) {
        tapTimer = setTimeout(() => {
          tapCount = 0
        }, 300)
      } else if (tapCount === 2) {
        clearTimeout(tapTimer)
        tapCount = 0

        // Double tap detected - like the post
        const postElement = img.closest("[data-post-id]")
        if (postElement) {
          const postId = postElement.dataset.postId
          const likeBtn = postElement.querySelector(".like-btn")

          if (!likeBtn.classList.contains("liked")) {
            likePost(postId)
            showLikeAnimation(e.target)
          }
        }
      }
    })
  })
}

function showLikeAnimation(element) {
  const heart = document.createElement("div")
  heart.innerHTML = "❤️"
  heart.style.position = "absolute"
  heart.style.fontSize = "60px"
  heart.style.pointerEvents = "none"
  heart.style.zIndex = "1000"
  heart.style.animation = "likeAnimation 1s ease-out forwards"

  const rect = element.getBoundingClientRect()
  heart.style.left = rect.left + rect.width / 2 - 30 + "px"
  heart.style.top = rect.top + rect.height / 2 - 30 + "px"

  document.body.appendChild(heart)

  setTimeout(() => {
    heart.remove()
  }, 1000)
}

// CSRF token helper
function getCookie(name) {
  let cookieValue = null
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";")
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim()
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
        break
      }
    }
  }
  return cookieValue
}

// AJAX helper function
function makeAjaxRequest(url, data, callback) {
  const xhr = new XMLHttpRequest()
  xhr.open("POST", url, true)
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded")
  xhr.setRequestHeader("X-CSRFToken", getCookie("csrftoken"))

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        callback(response)
      } else {
        console.error("Request failed:", xhr.status)
        showNotification("Something went wrong. Please try again.", "error")
      }
    }
  }

  // Convert data object to URL-encoded string
  const formData = Object.keys(data)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
    .join("&")

  xhr.send(formData)
}

function likePost(postId) {
  const postElement = document.querySelector(`[data-post-id="${postId}"]`)
  const likeBtn = postElement.querySelector(".like-btn")
  const likeCount = postElement.querySelector(".like-count")
  const heartIcon = likeBtn.querySelector("svg path")

  // Optimistic UI update
  const wasLiked = likeBtn.classList.contains("liked")

  if (wasLiked) {
    likeBtn.classList.remove("liked")
    heartIcon.setAttribute("fill", "none")
    heartIcon.setAttribute("stroke", "currentColor")
    likeCount.textContent = Number.parseInt(likeCount.textContent) - 1
  } else {
    likeBtn.classList.add("liked")
    heartIcon.setAttribute("fill", "#ed4956")
    heartIcon.setAttribute("stroke", "#ed4956")
    likeCount.textContent = Number.parseInt(likeCount.textContent) + 1

    // Add like animation
    likeBtn.style.transform = "scale(1.2)"
    setTimeout(() => {
      likeBtn.style.transform = "scale(1)"
    }, 150)
  }

  makeAjaxRequest("/ajax/like-post/", { post_id: postId }, (response) => {
    if (response.success !== undefined) {
      // Update with server response
      if (response.liked) {
        likeBtn.classList.add("liked")
        heartIcon.setAttribute("fill", "#ed4956")
        heartIcon.setAttribute("stroke", "#ed4956")
      } else {
        likeBtn.classList.remove("liked")
        heartIcon.setAttribute("fill", "none")
        heartIcon.setAttribute("stroke", "currentColor")
      }
      likeCount.textContent = response.likes_count
    }
  })
}

function followUser(username) {
  const userElement = document.querySelector(`[data-username="${username}"]`)
  const followBtn = userElement.querySelector(".follow-btn")
  const followerCount = userElement.querySelector(".follower-count")

  // Optimistic UI update
  const wasFollowing = followBtn.classList.contains("following")

  if (wasFollowing) {
    followBtn.textContent = "Follow"
    followBtn.classList.remove("following")
    if (followerCount) {
      followerCount.textContent = Number.parseInt(followerCount.textContent) - 1
    }
  } else {
    followBtn.textContent = "Following"
    followBtn.classList.add("following")
    if (followerCount) {
      followerCount.textContent = Number.parseInt(followerCount.textContent) + 1
    }

    // Add follow animation
    followBtn.style.transform = "scale(0.95)"
    setTimeout(() => {
      followBtn.style.transform = "scale(1)"
    }, 150)
  }

  makeAjaxRequest("/ajax/follow-user/", { username: username }, (response) => {
    if (response.success !== undefined) {
      // Update with server response
      followBtn.textContent = response.following ? "Following" : "Follow"
      followBtn.classList.toggle("following", response.following)

      if (followerCount) {
        followerCount.textContent = response.followers_count
      }

      // Show notification
      const message = response.following ? `You are now following ${username}` : `You unfollowed ${username}`
      showNotification(message, "success")
    }
  })
}

function addComment(postId, text) {
  if (!text.trim()) return

  const postElement = document.querySelector(`[data-post-id="${postId}"]`)
  const commentInput = postElement.querySelector(".comment-input")
  const postCommentBtn = postElement.querySelector(".post-comment-btn")
  const commentsContainer = postElement.querySelector(".comments-list") || document.getElementById("commentsList")

  // Disable input while posting
  commentInput.disabled = true
  postCommentBtn.disabled = true
  postCommentBtn.textContent = "Posting..."

  makeAjaxRequest("/ajax/add-comment/", { post_id: postId, text: text }, (response) => {
    if (response.success) {
      // Add comment to UI
      if (commentsContainer) {
        const commentHtml = `
                    <div class="comment">
                        <img src="${response.comment.user_avatar || "/static/images/default-avatar.jpg"}" 
                             alt="${response.comment.username}" class="comment-avatar">
                        <div class="comment-content">
                            <div class="comment-text">
                                <a href="/profile/${response.comment.username}/" class="comment-username">${response.comment.username}</a>
                                <span class="comment-message">${response.comment.text}</span>
                            </div>
                            <div class="comment-meta">
                                <span class="comment-time">now</span>
                                <button class="comment-like-btn">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `
        commentsContainer.insertAdjacentHTML("beforeend", commentHtml)

        // Scroll to new comment
        commentsContainer.scrollTop = commentsContainer.scrollHeight
      }

      // Update comment count
      const commentCountElements = postElement.querySelectorAll(".comments-count, .view-comments")
      commentCountElements.forEach((el) => {
        const currentCount = Number.parseInt(el.textContent.match(/\d+/)?.[0] || 0)
        el.textContent = el.textContent.replace(/\d+/, currentCount + 1)
      })

      // Clear input
      commentInput.value = ""
      postCommentBtn.classList.remove("active")

      showNotification("Comment added!", "success")
    } else {
      showNotification("Failed to add comment. Please try again.", "error")
    }

    // Re-enable input
    commentInput.disabled = false
    postCommentBtn.disabled = false
    postCommentBtn.textContent = "Post"
  })
}

// Send message functionality
function sendMessage(conversationId, text) {
  if (!text.trim()) return

  const messageInput = document.querySelector(".message-input")
  const sendBtn = document.querySelector(".send-message-btn")
  const messagesContainer = document.querySelector(".messages-list")

  // Disable input while sending
  messageInput.disabled = true
  sendBtn.disabled = true

  // Add temporary message with sending status
  const tempMessageId = "temp-" + Date.now()
  const tempMessageHtml = `
    <div class="message sent" id="${tempMessageId}">
      <div class="message-content">${text}</div>
      <div class="message-time">Sending...</div>
    </div>
  `

  if (messagesContainer) {
    messagesContainer.insertAdjacentHTML("beforeend", tempMessageHtml)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  makeAjaxRequest(
    "/ajax/send-message/",
    {
      conversation_id: conversationId,
      text: text,
    },
    (response) => {
      // Remove temporary message
      const tempMessage = document.getElementById(tempMessageId)
      if (tempMessage) {
        tempMessage.remove()
      }

      if (response.success && messagesContainer) {
        // Add real message
        const messageHtml = `
        <div class="message sent">
          <div class="message-content">${response.message.text}</div>
          <div class="message-time">${response.message.created_at}</div>
        </div>
      `
        messagesContainer.insertAdjacentHTML("beforeend", messageHtml)
        messagesContainer.scrollTop = messagesContainer.scrollHeight

        // Update conversation list if on messages page
        updateConversationPreview(conversationId, text)
      } else {
        showNotification("Failed to send message. Please try again.", "error")
      }

      // Re-enable input
      messageInput.disabled = false
      sendBtn.disabled = false
      messageInput.value = ""
      sendBtn.classList.remove("active")
      messageInput.focus()
    },
  )
}

function showNotification(message, type = "info") {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll(".notification")
  existingNotifications.forEach((n) => n.remove())

  const notification = document.createElement("div")
  notification.className = `notification notification-${type}`
  notification.textContent = message

  // Style the notification
  notification.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background-color: ${type === "error" ? "#ed4956" : type === "success" ? "#00ba7c" : "#1a1a1a"};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `

  document.body.appendChild(notification)

  // Animate in
  setTimeout(() => {
    notification.style.transform = "translateX(0)"
  }, 100)

  // Auto remove
  setTimeout(() => {
    notification.style.transform = "translateX(100%)"
    setTimeout(() => {
      notification.remove()
    }, 300)
  }, 3000)
}

function savePost(postId) {
  const postElement = document.querySelector(`[data-post-id="${postId}"]`)
  const saveBtn = postElement.querySelector(".save-btn")
  const saveIcon = saveBtn.querySelector("svg polygon")

  const wasSaved = saveBtn.classList.contains("saved")

  // Optimistic UI update
  if (wasSaved) {
    saveBtn.classList.remove("saved")
    saveIcon.setAttribute("fill", "none")
  } else {
    saveBtn.classList.add("saved")
    saveIcon.setAttribute("fill", "currentColor")

    // Add save animation
    saveBtn.style.transform = "scale(1.1)"
    setTimeout(() => {
      saveBtn.style.transform = "scale(1)"
    }, 150)
  }

  makeAjaxRequest("/ajax/save-post/", { post_id: postId }, (response) => {
    if (response.success !== undefined) {
      saveBtn.classList.toggle("saved", response.saved)
      saveIcon.setAttribute("fill", response.saved ? "currentColor" : "none")

      const message = response.saved ? "Post saved" : "Post removed from saved"
      showNotification(message, "success")
    }
  })
}

function likeComment(commentId) {
  const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`)
  const likeBtn = commentElement.querySelector(".comment-like-btn")
  const likesElement = commentElement.querySelector(".comment-likes")

  makeAjaxRequest("/ajax/like-comment/", { comment_id: commentId }, (response) => {
    if (response.success !== undefined) {
      likeBtn.classList.toggle("liked", response.liked)

      if (response.likes_count > 0) {
        if (!likesElement) {
          const meta = commentElement.querySelector(".comment-meta")
          meta.insertAdjacentHTML("beforeend", `<span class="comment-likes">${response.likes_count} likes</span>`)
        } else {
          likesElement.textContent = `${response.likes_count} likes`
        }
      } else if (likesElement) {
        likesElement.remove()
      }
    }
  })
}

function setupSearch() {
  const searchInput = document.querySelector(".search-input")
  if (!searchInput) return

  let searchTimeout

  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout)
    const query = e.target.value.trim()

    if (query.length > 0) {
      searchTimeout = setTimeout(() => {
        performSearch(query)
      }, 300)
    } else {
      hideSearchResults()
    }
  })

  // Hide results when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-search")) {
      hideSearchResults()
    }
  })
}

function performSearch(query) {
  makeAjaxRequest("/ajax/search-posts/", { query: query }, (response) => {
    if (response.users || response.posts) {
      showSearchResults(response.users || [], response.posts || [])
    } else {
      showSearchResults([], [])
    }
  })
}

function showSearchResults(users, posts) {
  let resultsContainer = document.querySelector(".search-results")

  if (!resultsContainer) {
    resultsContainer = document.createElement("div")
    resultsContainer.className = "search-results"
    resultsContainer.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background-color: #1a1a1a;
            border: 1px solid #262626;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            max-height: 300px;
            overflow-y: auto;
            z-index: 1000;
        `
    document.querySelector(".nav-search").appendChild(resultsContainer)
  }

  if (users.length === 0 && posts.length === 0) {
    resultsContainer.innerHTML = '<div class="search-no-results">No results found</div>'
    return
  }

  let html = ""

  if (users.length > 0) {
    html += '<div class="search-section-title">Users</div>'
    html += users
      .map(
        (user) => `
        <a href="/profile/${user.username}/" class="search-result-item">
            <img src="${user.profile_picture || "/static/images/default-avatar.jpg"}" alt="${user.username}" class="search-avatar">
            <div class="search-info">
                <div class="search-username">${user.username}</div>
                <div class="search-fullname">${user.full_name || ""}</div>
            </div>
        </a>
    `,
      )
      .join("")
  }

  if (posts.length > 0) {
    html += '<div class="search-section-title">Posts</div>'
    html += posts
      .map(
        (post) => `
        <a href="/post/${post.id}/" class="search-result-item">
            <img src="${post.image || "/static/images/default-avatar.jpg"}" alt="Post" class="search-avatar">
            <div class="search-info">
                <div class="search-username">@${post.username}</div>
                <div class="search-fullname">${post.caption}</div>
            </div>
        </a>
    `,
      )
      .join("")
  }

  resultsContainer.innerHTML = html
}

function hideSearchResults() {
  const resultsContainer = document.querySelector(".search-results")
  if (resultsContainer) {
    resultsContainer.remove()
  }
}

function initializeMessaging() {
  const messageInput = document.querySelector(".message-input")
  const sendBtn = document.querySelector(".send-message-btn")
  const messagesContainer = document.querySelector(".messages-list")

  if (!messageInput || !sendBtn) return

  const conversationId = document.querySelector("[data-conversation-id]")?.dataset.conversationId

  // Enable/disable send button based on input
  messageInput.addEventListener("input", () => {
    if (messageInput.value.trim()) {
      sendBtn.classList.add("active")
      sendBtn.disabled = false
    } else {
      sendBtn.classList.remove("active")
      sendBtn.disabled = true
    }
  })

  // Send message on Enter key
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey && messageInput.value.trim()) {
      e.preventDefault()
      sendMessage(conversationId, messageInput.value.trim())
    }
  })

  // Send message on button click
  sendBtn.addEventListener("click", () => {
    if (messageInput.value.trim()) {
      sendMessage(conversationId, messageInput.value.trim())
    }
  })

  // Auto-scroll to bottom on page load
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }
}

function updateConversationPreview(conversationId, lastMessage) {
  const conversationItem = document.querySelector(`[data-conversation-id="${conversationId}"]`)
  if (conversationItem) {
    const lastMessageEl = conversationItem.querySelector(".conversation-last-message")
    const timeEl = conversationItem.querySelector(".conversation-time")

    if (lastMessageEl) {
      lastMessageEl.textContent = lastMessage.length > 30 ? lastMessage.substring(0, 30) + "..." : lastMessage
    }
    if (timeEl) {
      timeEl.textContent = "now"
    }

    // Move conversation to top of list
    const conversationsList = conversationItem.parentElement
    conversationsList.insertBefore(conversationItem, conversationsList.firstChild)
  }
}

function startNewConversation() {
  const modal = document.getElementById("newMessageModal")
  if (modal) {
    modal.style.display = "flex"
    const searchInput = modal.querySelector(".user-search-input")
    if (searchInput) {
      searchInput.focus()
    }
  }
}

function closeNewMessageModal() {
  const modal = document.getElementById("newMessageModal")
  if (modal) {
    modal.style.display = "none"
    const searchInput = modal.querySelector(".user-search-input")
    const results = modal.querySelector(".user-search-results")
    if (searchInput) searchInput.value = ""
    if (results) results.innerHTML = ""
  }
}

function searchUsers(query) {
  if (query.length < 2) {
    document.querySelector(".user-search-results").innerHTML = ""
    return
  }

  makeAjaxRequest("/ajax/search-users/", { query: query }, (response) => {
    const resultsContainer = document.querySelector(".user-search-results")
    if (!resultsContainer) return

    if (response.users.length === 0) {
      resultsContainer.innerHTML = '<div class="no-users-found">No users found</div>'
      return
    }

    resultsContainer.innerHTML = response.users
      .map(
        (user) => `
      <div class="user-search-item" onclick="createConversation('${user.username}')">
        <img src="${user.profile_picture || "/static/images/default-avatar.jpg"}" alt="${user.username}" class="user-search-avatar">
        <div class="user-search-info">
          <div class="user-search-username">${user.username}</div>
          <div class="user-search-fullname">${user.full_name || ""}</div>
        </div>
      </div>
    `,
      )
      .join("")
  })
}

function createConversation(username) {
  makeAjaxRequest(
    "/ajax/create-conversation/",
    {
      participants: [username],
    },
    (response) => {
      if (response.success) {
        closeNewMessageModal()
        window.location.href = `/messages/${response.conversation_id}/`
      } else {
        showNotification("Failed to create conversation. Please try again.", "error")
      }
    },
  )
}

function initializeVideoPlayersFunc() {
  const videoPlayers = document.querySelectorAll(".video-player")

  videoPlayers.forEach((player) => {
    const video = player.querySelector("video")
    const controls = player.querySelector(".video-controls")
    const playBtn = player.querySelector(".play-pause-btn")
    const progressBar = player.querySelector(".video-progress")
    const progressFilled = player.querySelector(".video-progress-filled")
    const timeDisplay = player.querySelector(".video-time")
    const forwardBtn = player.querySelector(".forward-btn")
    const backwardBtn = player.querySelector(".backward-btn")
    const loopBtn = player.querySelector(".loop-btn")

    if (!video) return

    let controlsTimeout

    // Show/hide controls
    function showControls() {
      controls.classList.add("show")
      clearTimeout(controlsTimeout)
      controlsTimeout = setTimeout(() => {
        controls.classList.remove("show")
      }, 3000)
    }

    // Play/pause functionality
    function togglePlay() {
      if (video.paused) {
        video.play()
        playBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        `
      } else {
        video.pause()
        playBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        `
      }
    }

    // Update progress bar
    function updateProgress() {
      const progress = (video.currentTime / video.duration) * 100
      progressFilled.style.width = `${progress}%`

      const currentMinutes = Math.floor(video.currentTime / 60)
      const currentSeconds = Math.floor(video.currentTime % 60)
      const durationMinutes = Math.floor(video.duration / 60)
      const durationSeconds = Math.floor(video.duration % 60)

      timeDisplay.textContent = `${currentMinutes}:${currentSeconds.toString().padStart(2, "0")} / ${durationMinutes}:${durationSeconds.toString().padStart(2, "0")}`
    }

    // Seek functionality
    function seek(e) {
      const rect = progressBar.getBoundingClientRect()
      const pos = (e.clientX - rect.left) / rect.width
      video.currentTime = pos * video.duration
    }

    // Forward/backward 5 seconds
    function skipForward() {
      video.currentTime = Math.min(video.currentTime + 5, video.duration)
    }

    function skipBackward() {
      video.currentTime = Math.max(video.currentTime - 5, 0)
    }

    // Toggle loop
    function toggleLoop() {
      video.loop = !video.loop
      loopBtn.classList.toggle("active", video.loop)
    }

    // Event listeners
    video.addEventListener("click", togglePlay)
    video.addEventListener("timeupdate", updateProgress)
    video.addEventListener("loadedmetadata", updateProgress)

    player.addEventListener("mousemove", showControls)
    player.addEventListener("touchstart", showControls)

    if (playBtn) playBtn.addEventListener("click", togglePlay)
    if (progressBar) progressBar.addEventListener("click", seek)
    if (forwardBtn) forwardBtn.addEventListener("click", skipForward)
    if (backwardBtn) backwardBtn.addEventListener("click", skipBackward)
    if (loopBtn) loopBtn.addEventListener("click", toggleLoop)

    // Double tap to like (mobile)
    let tapCount = 0
    video.addEventListener("touchend", (e) => {
      tapCount++
      if (tapCount === 1) {
        setTimeout(() => {
          if (tapCount === 1) {
            togglePlay()
          } else if (tapCount === 2) {
            // Double tap to like
            const postElement = player.closest("[data-post-id]")
            if (postElement) {
              const postId = postElement.dataset.postId
              const likeBtn = postElement.querySelector(".like-btn")
              if (!likeBtn.classList.contains("liked")) {
                likePost(postId)
                showLikeAnimation(video)
              }
            }
          }
          tapCount = 0
        }, 300)
      }
    })
  })
}

function initializeUploadProgressFunc() {
  const uploadForms = document.querySelectorAll('form[enctype="multipart/form-data"]')

  uploadForms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      const fileInput = form.querySelector('input[type="file"]')
      if (fileInput && fileInput.files.length > 0) {
        showUploadProgressFunc()

        // Simulate upload progress (in real app, use XMLHttpRequest with progress events)
        let progress = 0
        const progressInterval = setInterval(() => {
          progress += Math.random() * 15
          if (progress >= 100) {
            progress = 100
            clearInterval(progressInterval)
            setTimeout(() => {
              hideUploadProgressFunc()
            }, 1000)
          }
          updateUploadProgressFunc(progress)
        }, 200)
      }
    })
  })
}

function showUploadProgressFunc() {
  const progressHtml = `
    <div class="upload-progress" id="uploadProgress">
      <div class="upload-progress-header">
        <span class="upload-progress-title">Uploading...</span>
        <button class="upload-progress-close" onclick="hideUploadProgressFunc()">×</button>
      </div>
      <div class="upload-progress-bar">
        <div class="upload-progress-fill" style="width: 0%"></div>
      </div>
      <div class="upload-progress-text">0% complete</div>
    </div>
  `
  document.body.insertAdjacentHTML("beforeend", progressHtml)
}

function updateUploadProgressFunc(progress) {
  const progressElement = document.getElementById("uploadProgress")
  if (progressElement) {
    const fill = progressElement.querySelector(".upload-progress-fill")
    const text = progressElement.querySelector(".upload-progress-text")

    fill.style.width = `${progress}%`
    text.textContent = `${Math.round(progress)}% complete`

    if (progress >= 100) {
      text.textContent = "Upload complete!"
    }
  }
}

function hideUploadProgressFunc() {
  const progressElement = document.getElementById("uploadProgress")
  if (progressElement) {
    progressElement.remove()
  }
}

function initializeSettingsTabsFunc() {
  const tabButtons = document.querySelectorAll(".settings-nav-item")
  const tabContents = document.querySelectorAll(".settings-tab")

  tabButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault()

      const targetTab = button.dataset.tab

      // Remove active class from all buttons and tabs
      tabButtons.forEach((btn) => btn.classList.remove("active"))
      tabContents.forEach((tab) => tab.classList.remove("active"))

      // Add active class to clicked button and corresponding tab
      button.classList.add("active")
      document.getElementById(`${targetTab}-tab`).classList.add("active")
    })
  })
}

function initializeMobileNavigationFunc() {
  // Add mobile navigation if on mobile
  if (window.innerWidth <= 768) {
    const mobileNavHtml = `
      <div class="mobile-nav">
        <a href="/home/" class="mobile-nav-item ${window.location.pathname === "/home/" ? "active" : ""}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          Home
        </a>
        <a href="/explore/" class="mobile-nav-item ${window.location.pathname === "/explore/" ? "active" : ""}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          Explore
        </a>
        <a href="/create/" class="mobile-nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
          Create
        </a>
        <a href="/messages/" class="mobile-nav-item ${window.location.pathname.includes("/messages/") ? "active" : ""}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Messages
        </a>
        <a href="/profile/${document.querySelector("[data-username]")?.dataset.username || "me"}/" class="mobile-nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Profile
        </a>
      </div>
    `
    document.body.insertAdjacentHTML("beforeend", mobileNavHtml)
  }
}

function initializeTouchGesturesFunc() {
  // Swipe gestures for mobile navigation
  let startX, startY, endX, endY

  document.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
  })

  document.addEventListener("touchend", (e) => {
    endX = e.changedTouches[0].clientX
    endY = e.changedTouches[0].clientY
    handleSwipeFunc()
  })

  function handleSwipeFunc() {
    const deltaX = endX - startX
    const deltaY = endY - startY

    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe right - go back
        if (window.history.length > 1) {
          window.history.back()
        }
      }
      // Swipe left could be used for forward navigation
    }
  }
}

function setupShareFunctionalityFunc() {
  const shareBtns = document.querySelectorAll(".share-btn")

  shareBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault()
      const postElement = btn.closest("[data-post-id]")
      if (postElement) {
        const postId = postElement.dataset.postId
        showShareModalFunc(postId)
      }
    })
  })
}

function showShareModalFunc(postId) {
  const shareModal = document.createElement("div")
  shareModal.className = "share-modal"
  shareModal.innerHTML = `
    <div class="modal-overlay" onclick="closeShareModalFunc()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Share Post</h2>
        <button class="close-modal-btn" onclick="closeShareModalFunc()">×</button>
      </div>
      <div class="share-options">
        <button class="share-option" onclick="shareToStory(${postId})">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          Share to Story
        </button>
        <button class="share-option" onclick="shareToMessageFunc(${postId})">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Send in Message
        </button>
        <button class="share-option" onclick="copyLinkFunc(${postId})">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          Copy Link
        </button>
      </div>
    </div>
  `

  document.body.appendChild(shareModal)
  shareModal.style.display = "flex"
}

function closeShareModalFunc() {
  const shareModal = document.querySelector(".share-modal")
  if (shareModal) {
    shareModal.remove()
  }
}

function copyLinkFunc(postId) {
  const url = `${window.location.origin}/post/${postId}/`
  navigator.clipboard
    .writeText(url)
    .then(() => {
      showNotification("Link copied to clipboard!", "success")
      closeShareModalFunc()
    })
    .catch(() => {
      showNotification("Failed to copy link", "error")
    })
}

function shareToMessageFunc(postId) {
  makeAjaxRequest(
    "/ajax/share-post/",
    {
      post_id: postId,
      share_type: "external",
    },
    (response) => {
      if (response.success) {
        // Open message modal with share link
        openNewMessageModal()
        closeShareModalFunc()
      }
    },
  )
}

function openNewMessageModal() {
  const modal = document.getElementById("newMessageModal")
  if (modal) {
    modal.style.display = "flex"
    const searchInput = modal.querySelector(".user-search-input")
    if (searchInput) {
      searchInput.focus()
    }
  }
}

function handleImagePreview(input, previewContainer) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        console.log("Previewing file:", { name: file.name, type: file.type });
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = "";
            if (file.type.startsWith("image/")) {
                const img = document.createElement("img");
                img.src = e.target.result;
                img.className = "image-preview";
                previewContainer.appendChild(img);
            } else if (file.type.startsWith("video/")) {
                const video = document.createElement("video");
                video.src = e.target.result;
                video.className = "video-preview";
                video.controls = true;
                previewContainer.appendChild(video);
            }
        };
        reader.readAsDataURL(file);
    }
}
// ----------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------
// Main JavaScript functionality
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded: Script loaded");
    const createPostForm = document.querySelector(".create-post-form");
    const mediaInput = document.querySelector("#mediaInput");
    const shareBtn = document.querySelector(".share-btn");
    const nextBtn = document.querySelector(".next-btn");
    const backBtn = document.querySelector(".back-btn");
    const postUploadSection = document.querySelector(".post-upload");
    const postDetailsSection = document.querySelector(".post-details");

    console.log("Post creation elements:", {
        createPostForm: !!createPostForm,
        mediaInput: !!mediaInput,
        shareBtn: !!shareBtn,
        nextBtn: !!nextBtn,
        backBtn: !!backBtn,
        postUploadSection: !!postUploadSection,
        postDetailsSection: !!postDetailsSection
    });

    if (createPostForm && mediaInput && shareBtn && nextBtn && backBtn && postUploadSection && postDetailsSection) {
        console.log("Setting up post creation listeners");
        shareBtn.disabled = true;

        mediaInput.addEventListener("change", () => {
            const hasFile = mediaInput.files.length > 0;
            console.log("Media input changed:", {
                hasFile,
                fileName: hasFile ? mediaInput.files[0].name : null,
                fileType: hasFile ? mediaInput.files[0].type : null,
                fileSize: hasFile ? mediaInput.files[0].size : null
            });
            shareBtn.disabled = !hasFile || postDetailsSection.classList.contains("hidden");
            if (hasFile) {
                handleImagePreview(mediaInput, document.getElementById("mediaPreview"));
            }
        });

        nextBtn.addEventListener("click", () => {
            console.log("Next button clicked");
            if (mediaInput.files.length > 0) {
                postUploadSection.classList.add("hidden");
                postDetailsSection.classList.remove("hidden");
                shareBtn.disabled = false;
                console.log("Switched to post-details section");
            } else {
                showNotification("Please select an image or video", "error");
                console.log("Next button: No file selected");
            }
        });

        backBtn.addEventListener("click", () => {
            console.log("Back button clicked");
            postDetailsSection.classList.add("hidden");
            postUploadSection.classList.remove("hidden");
            shareBtn.disabled = true;
            console.log("Switched to post-upload section");
        });

        createPostForm.addEventListener("submit", (e) => {
            e.preventDefault();
            console.log("Form submission triggered");
            if (!mediaInput.files.length) {
                showNotification("Please select an image or video", "error");
                console.log("Form submission: No file selected");
                return;
            }
            const formData = new FormData(createPostForm);
            console.log("Form data:", Array.from(formData.entries()));
            shareBtn.disabled = true;

            fetch("/create-post/", {
                method: "POST",
                body: formData,
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRFToken": getCookie("csrftoken"),
                },
            })
                .then((response) => {
                    console.log("Fetch response:", {
                        status: response.status,
                        statusText: response.statusText
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then((data) => {
                    console.log("JSON response:", data);
                    if (data.success) {
                        console.log("Post created, redirecting to:", data.redirect);
                        window.location.href = data.redirect;
                    } else {
                        showNotification(data.error || "Failed to create post", "error");
                        console.log("Post creation failed:", data.error);
                        shareBtn.disabled = false;
                    }
                })
                .catch((error) => {
                    console.error("Fetch error:", error);
                    showNotification("An error occurred while posting: " + error.message, "error");
                    shareBtn.disabled = false;
                });
        });
    } else {
        console.error("Missing post creation elements:", {
            createPostForm: !!createPostForm,
            mediaInput: !!mediaInput,
            shareBtn: !!shareBtn,
            nextBtn: !!nextBtn,
            backBtn: !!backBtn,
            postUploadSection: !!postUploadSection,
            postDetailsSection: !!postDetailsSection
        });
    }
});
// ----------------------------------------------------------------------------------
// Call the functions with different names
function initializeAll() {
  initializeLikeStates();
  initializeFollowStates();
  setupCommentHandlers();
  setupDoubleTapLike();
  initializeMessaging();
  initializeVideoPlayersFunc();
  initializeUploadProgressFunc();
  initializeSettingsTabsFunc();
  initializeMobileNavigationFunc();
  initializeTouchGesturesFunc();
  setupShareFunctionalityFunc();
}