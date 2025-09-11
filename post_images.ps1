# Step 1: Fetch CSRF token
curl.exe -c cookies.txt http://localhost:8000/login/ -s -o NUL

# Step 2: Extract CSRF token
$CsrfToken = Get-Content cookies.txt | Where-Object { $_ -match "csrftoken" } | ForEach-Object { ($_ -split "\t")[-1].Trim() }
Write-Host "CSRF token: $CsrfToken"

# Step 3: Log in
curl.exe -c cookies.txt -b cookies.txt -X POST http://localhost:8000/login/ `
    -H "Content-Type: application/x-www-form-urlencoded" `
    -H "X-CSRFToken: $CsrfToken" `
    -d "username=testuser&password=test@gmail.com" -v -o login_response.txt

# Step 4: Extract sessionid
$SessionId = Get-Content cookies.txt | Where-Object { $_ -match "sessionid" } | ForEach-Object { ($_ -split "\t")[-1].Trim() }
Write-Host "Session ID: $SessionId"

# Step 5: Post video
curl.exe -X POST http://localhost:8000/create-post/ `
    -H "Content-Type: multipart/form-data" `
    -H "X-CSRFToken: $CsrfToken" `
    -b "sessionid=$SessionId;csrftoken=$CsrfToken" `
    -F "caption=Test Video" `
    -F "video=@\"C:\Users\Aaron Abrams\Downloads\social-media-app\images\F22_C17_video.mp4\"" `
    -v -o response.txt
