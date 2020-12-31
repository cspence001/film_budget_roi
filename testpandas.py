for formatting

can set nad run new variables for formats but need solution for the end 
which only takes into account formatted variables and cant calculate



can format new variables but doesnt carry over later 
for calculation so calculation must be set 

examples 
average_purchase3 = (purchase_total3/purchase_count3).map("${:.2f}".format)
   "Average Price": (f'${round(ave_price, 2)}'),

purchasing_analysis = pd.DataFrame({"Number of Unique Items": [unique_items],
                                   "Average Price": (f'${round(ave_price, 2)}'),
                                   "Number of Purchases": total_purchases,
                                   "Total Revenue": "$"+str(total_revenue)})

.map("{0:.2f}%".format)

#set variables for table data, calculation for percent value and formatting
age_counts = total_counts["Age"].count()
percent_values = ((total_counts["Age"].count()/total_players)*100).map("{0:.2f}%".format)


#make table with gender and SN (data_functions: referencing multiple columns)
age_df4 = age_df[["SN","Age"]]
#new table to account for gender totals with duplicate SN
unique_age_df = age_df4.drop_duplicates (["SN"])

#gender_count based on unique SN, gender_percent calculation and format
age_count = unique_age_df["Age"].value_counts()

#need to account for unique
#per_person = age_df[["SN", "Age Ranges"]]
#per_person2 = per_person.drop_duplicates(["SN"])
#per_person3 = per_person2["Age Ranges"].value_counts()

#style format after df then re run dataframe, comment out and make note 
#of if put into jupyter notebook

gender_purchase_analysis.style.format({"Average Purchase Price": "${:,.2f}",
                                      "Total Purchase Value": "${:,.2f}",
                                      "Average Total Purchase Per Person": "${:,.2f}"})



duplicate_check = grouped_mice_df[grouped_mice_df.duplicated()]
print(duplicate_check)


duplicate_check = grouped_mice_df[grouped_mice_df.duplicated(keep=False)]
duplicate_check


clean_test = combined_study_df.dropna(how ="any")
clean_test.count()

timepoint_check = row_checks.loc[row_checks["Mouse ID"] != 10]
timepoint_check
imepoint_counts = grouped_study.loc[grouped_study["Timepoint"].value_counts()]
timepoint_counts

timepoint_check = combined_study_df.loc[combined_study_df["Timepoint"] != 10]
timepoint_check



four_regimen = cleaned_mouse.loc[cleaned_mouse['Drug Regimen'] =="Capomulin", "Ramicane", "Infubinol", "Ceftamin", :]
four_regimen
