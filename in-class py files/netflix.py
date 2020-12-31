import csv
import os

video = input("What show or movie are you looking? ")

#set path for the file
csvpath = os.path.join("Resources","netflix_ratings.csv")

# Import csv files to directory 

#initialize found 
found = False

#Open the csv
with open(csvpath) as csvfile:
    csvreader = csv.reader(csvfile, delimiter = ",")

#title,rating,ratingLevel,ratingDescription,release year,user rating score,user rating size
    for row in csvreader:
        if row[0] == video:
            print(row[0] + " is rated " + row[1] + " with a user rating score of " + row[5])
            found = True
            break 
if found is False:
    print("Not Available")



