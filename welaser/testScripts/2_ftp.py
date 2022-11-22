from dotenv import dotenv_values
from ftplib import FTP

conf = dotenv_values("../.env")
ftp = FTP()
ftp.connect(conf["IMAGESERVER_IP"], int(conf["IMAGESERVER_PORT_FTP21_EXT"]))
ftp.login(conf["IMAGESERVER_USER"], conf["IMAGESERVER_PWD"])
ftp.cwd('/data')
dir_list = []
ftp.dir(dir_list.append)
assert len(dir_list) > 2, "Not enough images: " + str(dir_list)
ftp.quit()
