# Public embed player must remain frameable by third-party sites.
set $csp_frame_ancestors "*";
include /etc/nginx/nginx-security-headers.inc;
include /etc/nginx/nginx-csp.inc;
