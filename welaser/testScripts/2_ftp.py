from dotenv import dotenv_values
from ftplib import FTP
import time

conf = dotenv_values("../.env")
ftp = FTP()
ftp.connect(conf["IMAGESERVER_IP"], int(conf["IMAGESERVER_PORT_FTP21_EXT"]))
ftp.login(conf["IMAGESERVER_USER"], conf["IMAGESERVER_PWD"])
# ftp.cwd('data')
# ftp.cwd('/home/' + conf["IMAGESERVER_USER"])
i = 20
dir_list = []
while i > 0 and len(dir_list) < 2:
    time.sleep(1)
    dir_list = []
    ftp.dir(dir_list.append)
assert len(dir_list) > 2, "Not enough images: " + str(dir_list)
ftp.quit()
