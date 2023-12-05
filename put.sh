#! /bin/bash

. "$HOME/ftp_creds_woggle.sh"
echo FTPURL=$FTPURL

chmod -R o+r "$LCD"
DELETE=--delete
lftp -c "set ftp:list-options -a;
	set net:connection-limit 4;
	open '$FTPURL';
	lcd $LCD;
	cd $RCD;
	mirror --reverse \
		$DELETE \
		--no-perms \
		--only-newer \
		--exclude-glob '*.sh' \
		--verbose;"
