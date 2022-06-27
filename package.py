#! /usr/bin/env python3

with open("index.html", "w") as indexhtml:
    with open("woggle.html", "r") as wogglehtml:
        for line in wogglehtml:
            if line.startswith("<script"):
                indexhtml.write("<script>\n")
                with open("woggle.js", "r") as wogglejs:
                    for jsline in wogglejs:
                        if jsline.startswith("import "):
                            with open("dic.js", "r") as dicjs:
                                for dicline in dicjs:
                                    indexhtml.write(dicline.lstrip("export "))
                        else:
                            indexhtml.write(jsline)
                indexhtml.write("</script>\n")
            elif line.startswith("""<link rel="stylesheet" """):
                indexhtml.write("""<style type="text/css">\n""")
                with open("woggle.css", "r") as wogglecss:
                    for cssline in wogglecss:
                        indexhtml.write(cssline)
                indexhtml.write("</style>\n")
            else:
                indexhtml.write(line)

#from subprocess import check_output
#check_output("scp index.html syno:/volume1/web/woggle".split())
