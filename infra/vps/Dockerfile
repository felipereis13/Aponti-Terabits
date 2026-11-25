FROM docker:29-dind

RUN apk add --no-cache openssh-server openssh-sftp-server \
    && adduser -D -u 1000 -G docker -s /bin/sh deploy \
    && passwd -d deploy \
    && mkdir -p /run/sshd /opt/terabits/apps /etc/ssh/keys \
    && chown deploy:docker /opt/terabits/apps

COPY sshd_config /etc/ssh/sshd_config
COPY entrypoint.sh /usr/local/bin/terabits-lab
RUN sed -i 's/\r$//' /usr/local/bin/terabits-lab && chmod 755 /usr/local/bin/terabits-lab

EXPOSE 22
ENTRYPOINT ["/usr/local/bin/terabits-lab"]
