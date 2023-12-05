#! /bin/bash

. "$HOME/ftp_creds_woggle.sh"
echo FTPURL=$FTPURL

chmod -R o+r "$LCD"
DELETE=--delete
lftp -c "set ftp:list-options -a;
	open '$FTPURL';
	mirror --reverse \
		$DELETE \
		--no-perms \
		--only-newer \
		--exclude-glob=www/blog/ \
		--verbose=3 \
		'$LCD' '$RCD';"
#	set net:connection-limit 4;
