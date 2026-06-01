# Deployment Guide - eloai.dev

## Complete Setup & Deployment Instructions

This guide covers deploying eloai.dev to InMotion Hosting with Cloudflare DNS and SSL configuration.

---

## Prerequisites

- **Domain:** eloai.dev (registered/managed through Cloudflare)
- **Hosting:** InMotion Hosting account (cPanel access)
- **DNS:** Cloudflare account (free tier works)
- **Files:** Website files ready to deploy

---

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   eloai.dev     │ →  │    Cloudflare    │ →  │  InMotion       │
│   (Domain)      │    │  (DNS + SSL +    │    │  Hosting        │
│                 │    │   CDN + Security)│    │  (Web Server)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## Step 1: InMotion Hosting Setup

### 1.1 Log into cPanel

1. Go to your InMotion Hosting account
2. Click "cPanel Admin" or go directly to `yourdomain.com/cpanel`
3. Log in with your cPanel credentials

### 1.2 Create Addon Domain (if needed)

If eloai.dev is not your primary domain:

1. In cPanel, go to **Domains → Addon Domains**
2. Enter:
   - **Domain Name:** eloai.dev
   - **Subdomain/FTP Username:** auto-filled
   - **Password:** create a strong password
   - **Document Root:** `/public_html/eloai.dev` (or your preferred path)
3. Click **Add Domain**

### 1.3 Get Nameserver Information

1. In cPanel, go to **Domains → Zone Editor** (or **DNS Settings**)
2. Note the nameservers (usually something like):
   - `ns1.inmotionhosting.com`
   - `ns2.inmotionhosting.com`
3. You'll need these for Cloudflare setup

### 1.4 Create Database (if needed)

If your site uses a database:

1. Go to **MySQL® Databases**
2. Create a new database: `eloai_db`
3. Create a database user with a strong password
4. Add user to database with **All Privileges**
5. Note the credentials for your config file

### 1.5 Upload Website Files

#### Option A: File Manager (Easiest)

1. Go to **Files → File Manager**
2. Navigate to your document root (`/public_html/eloai.dev`)
3. Click **Upload** and select all your website files
4. Wait for upload to complete

#### Option B: FTP (Recommended for large sites)

1. Use an FTP client (FileZilla, Cyberduck, etc.)
2. Connect using:
   - **Host:** your server's IP or domain
   - **Username:** your FTP username
   - **Password:** your FTP password
   - **Port:** 21 (FTP) or 22 (SFTP - more secure)
3. Upload all files to the document root

#### Option C: Git (For developers)

1. In cPanel, go to **Git Version Control**
2. Click **Create** and enter your repository URL
3. Set deployment path to your document root
4. Deploy from your local machine:
   ```bash
   git push origin main
   ```

### 1.6 Set File Permissions

1. In File Manager, select all files
2. Click **Change Permissions**
3. Set:
   - **Files:** 644
   - **Folders:** 755
   - **Config files:** 600 (more restrictive)

### 1.7 Configure PHP (if needed)

1. Go to **Software → Select PHP Version**
2. Choose PHP 8.1 or 8.2 (recommended)
3. Enable required extensions:
   - `mysqli`
   - `curl`
   - `json`
   - `mbstring`
   - `openssl`
4. Click **Set as Current**

---

## Step 2: Cloudflare Setup

### 2.1 Add Your Site to Cloudflare

1. Log into Cloudflare dashboard
2. Click **Add a Site**
3. Enter `eloai.dev`
4. Select **Free plan** (or your preferred plan)
5. Click **Continue**

### 2.2 Review DNS Records

Cloudflare will scan your existing DNS records. Review and ensure:

- **A record** for `eloai.dev` → points to InMotion IP
- **A record** for `www.eloai.dev` → points to InMotion IP
- **MX records** for email (if using InMotion email)
- **TXT records** for verification (if any)

**Important:** Remove any duplicate or conflicting records.

### 2.3 Update Nameservers

1. Cloudflare will provide two nameservers (e.g., `lara.ns.cloudflare.com` and `nick.ns.cloudflare.com`)
2. Go to your domain registrar (where you registered eloai.dev)
3. Update nameservers to Cloudflare's
4. Save changes

**If your domain is registered with InMotion:**
1. Log into InMotion Hosting AMP
2. Go to **Domains → Manage Domains**
3. Click **Change Nameservers**
4. Enter Cloudflare nameservers
5. Save

### 2.4 Wait for Propagation

DNS changes can take 24-48 hours to fully propagate. You can check status:

```bash
nslookup eloai.dev
# or
dig eloai.dev
```

### 2.5 SSL/TLS Configuration

1. In Cloudflare dashboard, go to **SSL/TLS**
2. Set **SSL/TLS encryption mode** to **Full** or **Full (Strict)**
   - **Full:** Encrypts between Cloudflare and your server (works with self-signed certs)
   - **Full (Strict):** Requires valid SSL certificate on your server (recommended)
3. Enable **Always Use HTTPS** under **SSL/TLS → Edge Certificates**
4. Enable **Automatic HTTPS Rewrites**

### 2.6 Enable Security Features

#### Essential Security Settings:

1. **SSL/TLS → Edge Certificates:**
   - ✅ Always Use HTTPS
   - ✅ Automatic HTTPS Rewrites
   - ✅ Minimum TLS Version: 1.2
   - ✅ Opportunistic Encryption
   - ✅ TLS 1.3

2. **Security → Settings:**
   - Security Level: **Medium** (or High if under attack)
   - Challenge Passage: **30 minutes**
   - Browser Integrity Check: **On**

3. **Firewall → Firewall Rules:**
   - Create rules to block malicious traffic
   - Example: Block countries you don't expect traffic from

4. **Bot Fight Mode:** **On** (if available on your plan)

### 2.7 Performance Optimization

1. **Caching → Configuration:**
   - Caching Level: **Standard**
   - Browser Cache TTL: **4 hours** (or longer for static sites)

2. **Speed → Optimization:**
   - ✅ Auto Minify: CSS, JavaScript, HTML
   - ✅ Brotli compression
   - ✅ Early Hints

3. **Network:**
   - ✅ HTTP/2
   - ✅ HTTP/3 (if available)
   - ✅ gRPC

### 2.8 Page Rules (Optional but Recommended)

Create these Page Rules:

1. **Force HTTPS for all traffic:**
   - URL: `http://eloai.dev/*`
   - Setting: **Always Use HTTPS**

2. **Cache static assets:**
   - URL: `eloai.dev/assets/*`
   - Settings:
     - Cache Level: **Cache Everything**
     - Edge Cache TTL: **1 month**

3. **Bypass cache for admin/dynamic content:**
   - URL: `eloai.dev/wp-admin/*` (if using WordPress)
   - Setting: **Bypass Cache**

---

## Step 3: InMotion Hosting SSL Setup

### 3.1 Install SSL Certificate

#### Option A: Let's Encrypt (Free - Recommended)

1. In cPanel, go to **SSL/TLS → Let's Encrypt SSL**
2. Find `eloai.dev` in the list
3. Click **Issue**
4. Wait for certificate to be issued (usually instant)
5. Certificate is automatically installed

#### Option B: Upload Custom Certificate

If you have a purchased SSL certificate:

1. Go to **SSL/TLS → SSL Certificates**
2. Click **Generate, view, upload, or use**
3. Paste your certificate, private key, and CA bundle
4. Click **Install Certificate**

### 3.2 Force HTTPS Redirect

1. In cPanel, go to **Domains → Redirects**
2. Create redirect:
   - **Type:** Permanent (301)
   - **https?://(www\.)?eloai\.dev/** 
   - **Redirects to:** `https://eloai.dev/`
   - **www. redirection:** Redirect with or without www
3. Click **Add**

Alternatively, add to `.htaccess`:

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
RewriteCond %{HTTP_HOST} ^www\. [NC]
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### 3.3 Update Site Configuration

If your site has a configuration file (e.g., `config.php`, `.env`):

1. Update site URL to `https://eloai.dev`
2. Update any hardcoded HTTP links to HTTPS
3. Update database URLs if applicable

---

## Step 4: Verify Deployment

### 4.1 Check Website

1. Visit `https://eloai.dev` in your browser
2. Verify:
   - ✅ Site loads correctly
   - ✅ HTTPS is working (green lock)
   - ✅ All pages load
   - ✅ Images and assets load
   - ✅ Forms work (if any)
   - ✅ No mixed content warnings

### 4.2 Test SSL/TLS

Use SSL Labs to test your SSL configuration:

1. Go to [SSL Labs Test](https://www.ssllabs.com/ssltest/)
2. Enter `eloai.dev`
3. Run test
4. Aim for **A** or **A+** rating

### 4.3 Check Cloudflare

1. In Cloudflare dashboard, check **Analytics**
2. Verify traffic is flowing through Cloudflare
3. Check **Security** for any blocked threats

### 4.4 Test Performance

1. Use [GTmetrix](https://gtmetrix.com/) or [PageSpeed Insights](https://pagespeed.web.dev/)
2. Enter `https://eloai.dev`
3. Check scores and recommendations
4. Aim for >90 performance score

### 4.5 Verify DNS Propagation

Check if DNS has propagated globally:

1. Use [DNS Checker](https://dnschecker.org/)
2. Enter `eloai.dev`
3. Verify it resolves to Cloudflare IPs worldwide

---

## Step 5: Ongoing Maintenance

### 5.1 Regular Backups

#### InMotion Hosting Backups:

1. In cPanel, go to **Backup Wizard**
2. Schedule regular backups:
   - **Full backup:** Weekly
   - **Database backup:** Daily (if dynamic site)
3. Store backups off-server (download to local machine or cloud storage)

#### Cloudflare Backups:

Cloudflare doesn't backup your site content, but keep these settings:

- **DNS records** are backed up in Cloudflare
- **Page Rules** are saved in your account

### 5.2 Security Monitoring

1. **Cloudflare Security Events:**
   - Check **Security → Events** weekly
   - Review blocked threats
   - Adjust firewall rules as needed

2. **InMotion Security:**
   - Enable **Hotlink Protection** in cPanel
   - Enable **Leech Protection** for sensitive directories
   - Use **IP Blocker** for persistent attackers

3. **Regular Scans:**
   - Use cPanel **Virus Scanner** monthly
   - Check for malware with [Sucuri SiteCheck](https://sitecheck.sucuri.net/)

### 5.3 Performance Monitoring

1. **Cloudflare Analytics:**
   - Monitor bandwidth usage
   - Check cached vs uncached requests
   - Review threat analytics

2. **Uptime Monitoring:**
   - Set up [UptimeRobot](https://uptimerobot.com/) (free)
   - Monitor every 5 minutes
   - Get email alerts for downtime

3. **Performance Testing:**
   - Run PageSpeed Insights monthly
   - Monitor Core Web Vitals in Google Search Console

### 5.4 Updates

1. **SSL Certificate:**
   - Let's Encrypt auto-renews every 90 days
   - Check expiration in cPanel → SSL/TLS
   - Set calendar reminder 1 week before expiration

2. **Software Updates:**
   - Update PHP version quarterly (test first!)
   - Update any CMS (WordPress, etc.) immediately
   - Update plugins/themes regularly

3. **Cloudflare Updates:**
   - Review new features quarterly
   - Update security settings as threats evolve

---

## Troubleshooting

### Common Issues & Solutions

#### Site Not Loading

1. **Check DNS propagation:**
   ```bash
   dig eloai.dev +short
   ```
   Should return Cloudflare IPs

2. **Check nameservers:**
   ```bash
   nslookup -type=NS eloai.dev
   ```
   Should show Cloudflare nameservers

3. **Check file permissions:**
   - Files: 644
   - Folders: 755

#### SSL Errors

1. **Mixed content warnings:**
   - Search for `http://` in your code and replace with `https://`
   - Use Cloudflare **Automatic HTTPS Rewrites**

2. **Certificate not trusted:**
   - Ensure SSL is properly installed in cPanel
   - Check certificate chain is complete

3. **Redirect loops:**
   - Check `.htaccess` for conflicting rules
   - Ensure Cloudflare SSL mode is **Full** or **Full (Strict)**
   - Not **Flexible** (causes loops)

#### Slow Performance

1. **Enable Cloudflare caching:**
   - Set Caching Level to **Standard**
   - Enable Auto Minify

2. **Optimize images:**
   - Compress images before upload
   - Use WebP format where possible

3. **Check server resources:**
   - In cPanel, check **Metrics → Resource Usage**
   - Upgrade hosting plan if consistently hitting limits

#### Email Issues

1. **MX records:**
   - Ensure MX records point to correct mail server
   - In Cloudflare DNS, set proxy status to **DNS only** (gray cloud) for MX records

2. **SPF/DKIM:**
   - Add SPF record: `v=spf1 include:inmotionhosting.com ~all`
   - Set up DKIM in cPanel → Email Authentication

---

## Quick Reference Commands

### DNS Checks

```bash
# Check A record
dig eloai.dev A +short

# Check nameservers
nslookup -type=NS eloai.dev

# Check if site is up
curl -I https://eloai.dev
```

### File Operations

```bash
# Connect via SSH (if available)
ssh username@eloai.dev

# Check disk usage
df -h

# Check file permissions
ls -la /home/username/public_html/eloai.dev/

# Fix permissions
find /home/username/public_html/eloai.dev/ -type f -exec chmod 644 {} \;
find /home/username/public_html/eloai.dev/ -type d -exec chmod 755 {} \;
```

### SSL Checks

```bash
# Check SSL certificate
echo | openssl s_client -connect eloai.dev:443 -servername eloai.dev 2>/dev/null | openssl x509 -noout -dates

# Check SSL rating
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=eloai.dev
```

---

## Contact Information

### InMotion Hosting Support
- **24/7 Live Chat:** Available in your account
- **Phone:** 1-888-321-HOST (4678)
- **Ticket System:** Through your account dashboard

### Cloudflare Support
- **Community Forum:** community.cloudflare.com
- **Help Center:** support.cloudflare.com
- **Twitter:** @CloudflareHelp

### Emergency Contacts
- **Site Down:** Check Cloudflare status first (status.cloudflare.com)
- **Security Incident:** Contact both InMotion and Cloudflare immediately

---

## Checklist: Pre-Launch

- [ ] Files uploaded to InMotion Hosting
- [ ] File permissions set correctly (644/755)
- [ ] SSL certificate installed and working
- [ ] HTTPS redirect configured
- [ ] Cloudflare DNS configured
- [ ] Nameservers updated to Cloudflare
- [ ] SSL/TLS mode set to Full (Strict)
- [ ] Security features enabled
- [ ] Caching configured
- [ ] Performance optimizations applied
- [ ] Site tested and working
- [ ] Backups scheduled
- [ ] Monitoring set up
- [ ] Email configured (if applicable)

---

## Checklist: Post-Launch

- [ ] Submit sitemap to Google Search Console
- [ ] Set up Google Analytics
- [ ] Test all forms and functionality
- [ ] Check mobile responsiveness
- [ ] Test page load speed
- [ ] Verify SSL is working properly
- [ ] Monitor for 24 hours for any issues
- [ ] Announce launch on social media

---

*Last updated: May 2026*  
*For questions or updates to this guide, contact the development team.*