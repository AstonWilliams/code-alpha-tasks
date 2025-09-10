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
  makeAjaxRequest("/ajax/search/", { query: query }, (response) => {
    showSearchResults(response.results)
  })
}

function showSearchResults(results) {
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

  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="search-no-results">No results found</div>'
    return
  }

  resultsContainer.innerHTML = results
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
  makeAjaxRequest("/ajax/create-conversation/", { username: username }, (response) => {
    if (response.success) {
      closeNewMessageModal()
      window.location.href = `/messages/${response.conversation_id}/`
    } else {
      showNotification("Failed to create conversation. Please try again.", "error")
    }
  })
}
