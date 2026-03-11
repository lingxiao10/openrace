# 部署指南 — 宝塔面板 + MySQL + PM2

> 基于 openstory 项目实际部署经验总结

---

## 1. MySQL 数据库初始化

### 1.1 连接 MySQL（宝塔面板的 MySQL sock 路径）

```bash
mysql -S /tmp/mysql.sock -u root -p"ROOT密码"
```

### 1.2 创建数据库和用户

```sql
CREATE DATABASE IF NOT EXISTS game_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'game_ai'@'localhost' IDENTIFIED BY '你的密码';
CREATE USER IF NOT EXISTS 'game_ai'@'127.0.0.1' IDENTIFIED BY '你的密码';
GRANT ALL PRIVILEGES ON game_ai.* TO 'game_ai'@'localhost';
GRANT ALL PRIVILEGES ON game_ai.* TO 'game_ai'@'127.0.0.1';
FLUSH PRIVILEGES;
```

> 注意：localhost 走 Unix socket，127.0.0.1 走 TCP，Node.js 连接时可能用任意一种，两个都要授权。

### 1.3 执行 schema 和迁移

```bash
mysql -S /tmp/mysql.sock -u root -p"ROOT密码" < backend/schema.sql

for f in backend/migrations/*.sql; do
  mysql -S /tmp/mysql.sock -u root -p"ROOT密码" game_ai < "$f" 2>&1
done
```

> 注意：MySQL 8.0 不支持 ADD COLUMN IF NOT EXISTS，迁移报错时检查列是否已存在，手动补充缺失的列。

### 1.4 MySQL 常用坑

- Access denied for 127.0.0.1：只授权了 localhost，同时授权 'user'@'127.0.0.1'
- ADD COLUMN IF NOT EXISTS 报错：MySQL 8.0 不支持此语法，手动检查并 ADD COLUMN
- generated 关键字报错：MySQL 8.0 保留字，列名加反引号
- TINYINT 字段在 React 前端渲染出 0：{0 && <Component/>} 会渲染数字 0，改为 {!!value && <Component/>}

---

## 2. 项目目录权限

宝塔面板创建的文件默认属于 root，devuser 无法写入 dist/ 或 node_modules/。

```bash
chown -R devuser:devuser /www/wwwroot/openrace.devokai.com/openrace/backend
chown -R devuser:devuser /www/wwwroot/openrace.devokai.com/openrace/frontend
```

---

## 3. 构建

```bash
cd backend && npm run build
cd frontend && npm run build
```

---

## 4. PM2 启动后端

```bash
# 安装 pm2（无 root 权限时）
npm install -g pm2 --prefix ~/.local

# 启动
~/.local/bin/pm2 start backend/dist/app.js --name openrace-backend

# 保存进程列表
~/.local/bin/pm2 save

# 开机自启（需 root 执行输出的命令）
~/.local/bin/pm2 startup
```

---

## 5. Nginx 配置（HTTPS）

证书路径：/www/server/panel/vhost/cert/域名/（fullchain.pem + privkey.pem）

以 root 创建 /www/server/panel/vhost/nginx/域名.conf：

```
server {
    listen 80;
    server_name 域名;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name 域名;

    ssl_certificate /www/server/panel/vhost/cert/域名/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/域名/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    root /www/wwwroot/.../frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:后端端口;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

nginx -s reload

注意事项：
- 宝塔 SSL 文件验证会被 try_files 拦截，用 DNS 验证绕过
- 宝塔不认手动创建的 nginx 配置，申请 SSL 时选 DNS 验证
- nginx 配置需 root 写入，写成 sh 脚本用 root 执行

---

## 6. 验证

```bash
curl -o /dev/null -w "%{http_code}" https://域名/
curl -o /dev/null -w "%{http_code}" https://域名/api/init
```

两个都返回 200 即部署成功。
