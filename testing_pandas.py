#renames Gender column to Purchase Count
gender_purchase_analysis = purchase_data.groupby(["Gender"])
gender_purchase_analysis.count().head()

#variable calculations
purchase_total = gender_purchase_analysis["Price"].sum()
purchase_count = gender_purchase_analysis["Purchase ID"].count()
average_purchase = purchase_total/purchase_count

#uses gender_count variable to account for unique users
average_total = purchase_total/gender_count

gender_purchase_analysis = pd.DataFrame({"Purchase Count": purchase_count,
                                 "Average Purchase Price": average_purchase,
                                 "Total Purchase Value": purchase_total,
                                 "Average Total Purchase Per Person": average_total })
gender_purchase_analysis
