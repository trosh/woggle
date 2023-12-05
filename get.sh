#! /bin/bash

. "$HOME/ftp_creds_woggle.sh"
echo FTPURL=$FTPURL

DELETE=--delete
lftp -c "set ftp:list-options -a;
	set net:connection-limit 4;
	open '$FTPURL';
	lcd '$LCD';
	cd '$RCD';
	mirror \
		$DELETE \
		--no-perms \
		--exclude='www/blog/' \
		--verbose=3 ;"
chmod -R o+r "$LCD"
		#--only-newer \
