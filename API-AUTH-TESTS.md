# eStokvel Authentication API Examples

## BASE URL
http://localhost:5000/api/auth

## 1. REGISTER NEW USER
POST /register
Content-Type: application/json

{
  "phoneNumber": "27830000001",
  "password": "password123",
  "fullName": "Test User One"
}

## 2. LOGIN WITH EXISTING USER
POST /login
Content-Type: application/json

{
  "phoneNumber": "27831234567",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-uuid",
      "phoneNumber": "27831234567",
      "fullName": "John Doe",
      "lastLogin": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

## 3. GET CURRENT USER (PROTECTED)
GET /me
Authorization: Bearer YOUR_JWT_TOKEN_HERE

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "phoneNumber": "27831234567",
      "fullName": "John Doe",
      "email": null,
      "language": "en",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "lastLogin": "2024-01-15T10:30:00.000Z"
    }
  }
}

## 4. TEST CREDENTIALS (from seed.ts)
Phone: 27831234567
Password: password123
Role: TREASURER

Phone: 27831234568
Password: password123
Role: SECRETARY

Phone: 27831234569
Password: password123
Role: MEMBER

## 5. ERROR RESPONSES
### Invalid credentials:
{
  "success": false,
  "message": "Invalid phone number or password"
}

### Validation errors:
{
  "success": false,
  "errors": [
    {
      "type": "field",
      "value": "123",
      "msg": "Please provide a valid phone number",
      "path": "phoneNumber",
      "location": "body"
    }
  ]
}

### Missing token:
{
  "success": false,
  "message": "No authentication token provided"
}

### Invalid token:
{
  "success": false,
  "message": "Invalid or expired token"
}
