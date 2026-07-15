export function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': '邮箱或密码错误',
    'User already registered': '该邮箱已被注册',
    'Email not confirmed': '邮箱尚未验证，请查收验证邮件后再登录',
    'Password should be at least 6 characters': '密码至少需要6位',
    'Unable to validate email address: invalid format': '邮箱格式不正确',
    'Email rate limit exceeded': '操作过于频繁，请稍后再试',
    'signup disabled': '当前不支持注册，请联系管理员',
    'User not found': '用户不存在',
    'Wrong password': '密码错误',
    'Password is incorrect': '密码错误',
    'Email already exists': '该邮箱已被注册',
    'email must be confirmed': '邮箱尚未验证，请查收验证邮件后再登录',
    'invalid email': '邮箱格式不正确',
    'Invalid email': '邮箱格式不正确',
    'too many failed attempts': '登录失败次数过多，请稍后再试',
    'Rate limit exceeded': '操作过于频繁，请稍后再试',
    'Invalid token': '验证码输入有误',
    'Invalid OTP': '验证码输入有误',
    'OTP is invalid': '验证码输入有误',
    'token is invalid': '验证码输入有误',
    'Token has expired': '验证码已过期，请重新获取',
    'OTP has expired': '验证码已过期，请重新获取',
    'token has expired': '验证码已过期，请重新获取',
  }

  const matched = Object.keys(map).find((key) => message.includes(key))
  return matched ? map[matched] : '操作失败，请稍后重试'
}