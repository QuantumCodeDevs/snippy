# App HTML/static: clickjacking blocked. Named locations must include this
# too — nginx add_header does not inherit across internal redirects.
set $csp_frame_ancestors "'self'";
include /etc/nginx/nginx-security-headers.inc;
include /etc/nginx/nginx-csp.inc;
add_header X-Frame-Options "SAMEORIGIN" always;
