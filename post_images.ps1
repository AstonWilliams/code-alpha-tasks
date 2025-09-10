# Configuration
$LoginUrl = "http://localhost:8000/login/"
$PostUrl = "http://localhost:8000/create-post/"
$ImagesDir = "C:\Users\Aaron Abrams\Downloads\social-media-app\images"
$CookiesFile = "$PWD\cookies.txt"  # Use $PWD for correct path
$Username = "testuser"
$Password = "test@gmail.com"
$NumPosts = 5  # Number of posts to attempt

# Ensure curl.exe is available
if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) {
    Write-Host "Error: curl.exe not found. Ensure it is installed (available in Git Bash or Windows 10+)."
    exit 1
}

# Ensure server is running
Write-Host "Checking server connectivity..."
$ServerCheck = curl.exe -I $LoginUrl -s -o NUL -w "%{http_code}"
if ($ServerCheck -ne 200) {
    Write-Host "Error: Cannot connect to $LoginUrl (HTTP $ServerCheck). Ensure server is running (python manage.py runserver)."
    exit 1
}

# Step 1: Fetch CSRF token
Write-Host "Fetching CSRF token..."
curl.exe -c $CookiesFile $LoginUrl -s -o NUL
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to fetch CSRF token (curl error $LASTEXITCODE)."
    exit 1
}

# Extract CSRF token (only the token value)
if (-not (Test-Path $CookiesFile)) {
    Write-Host "Error: Cookies file not created at $CookiesFile."
    exit 1
}
$CsrfTokenLine = Get-Content $CookiesFile | Where-Object { $_ -match "csrftoken" }
if (-not $CsrfTokenLine) {
    Write-Host "Error: Could not find csrftoken in $CookiesFile."
    exit 1
}
$CsrfToken = ($CsrfTokenLine -split "\t")[-1].Trim()
if (-not $CsrfToken) {
    Write-Host "Error: CSRF token is empty."
    exit 1
}
Write-Host "CSRF token: $CsrfToken (Length: $($CsrfToken.Length) characters)"

# Step 2: Log in
Write-Host "Logging in as $Username..."
$LoginResponse = curl.exe -c $CookiesFile -b $CookiesFile -X POST $LoginUrl `
    -H "Content-Type: application/x-www-form-urlencoded" `
    -H "X-CSRFToken: $CsrfToken" `
    -d "username=$Username&password=$Password" -s -o login_response.txt -w "%{http_code}"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: curl failed during login (curl error $LASTEXITCODE)."
    Get-Content login_response.txt -ErrorAction SilentlyContinue
    exit 1
}
$LoginStatus = $LoginResponse
if ($LoginStatus -eq 302) {
    Write-Host "Login successful"
} else {
    Write-Host "Login failed (HTTP $LoginStatus). Response:"
    Get-Content login_response.txt -ErrorAction SilentlyContinue
    exit 1
}

# Extract sessionid
$SessionIdLine = Get-Content $CookiesFile | Where-Object { $_ -match "sessionid" }
if (-not $SessionIdLine) {
    Write-Host "Error: Could not find sessionid in $CookiesFile."
    exit 1
}
$SessionId = ($SessionIdLine -split "\t")[-1].Trim()
Write-Host "Session ID: $SessionId"

# Step 3: Get list of images (jpg, jpeg, png, gif, jfif)
$Images = Get-ChildItem -Path $ImagesDir -File -Include *.jpg,*.jpeg,*.png,*.gif,*.jfif -Recurse | Get-Random -Count $NumPosts
if ($Images.Count -eq 0) {
    Write-Host "No images found in $ImagesDir"
    exit 1
}

# Step 4: Post random images
foreach ($Image in $Images) {
    $ImagePath = $Image.FullName
    # Generate random caption (max 500 chars)
    $Caption = "Random post $(Get-Random -Maximum 1000) for $($Image.Name)"

    Write-Host "Posting: $ImagePath with caption: $Caption"

    # Run curl with verbose output and error capture
    $Response = curl.exe -X POST $PostUrl `
        -H "Content-Type: multipart/form-data" `
        -H "X-CSRFToken: $CsrfToken" `
        -b "sessionid=$SessionId;csrftoken=$CsrfToken" `
        -F "caption=$Caption" `
        -F "image=@$ImagePath" `
        -w "%{http_code}" -s -o response.txt 2> curl_error.txt

    $CurlExit = $LASTEXITCODE
    if ($CurlExit -ne 0) {
        Write-Host "Failed for $ImagePath (curl error $CurlExit)"
        Write-Host "curl error:"
        Get-Content curl_error.txt -ErrorAction SilentlyContinue
        continue
    }

    if ($Response -eq 302) {
        Write-Host "Success for $ImagePath (HTTP 302)"
    } else {
        Write-Host "Failed for $ImagePath (HTTP $Response)"
        Write-Host "Response body:"
        if (Test-Path response.txt) {
            Get-Content response.txt
        } else {
            Write-Host "No response body (response.txt not created)"
        }
    }
}