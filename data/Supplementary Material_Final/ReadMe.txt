Copyright (c) 2020, (s.kusmakar@deakin.edu.au) rights reserved.
 Redistribution and use in source and binary forms, with or without
modification, are permitted with acknowledgment.

Description---

1) The actigraphy data files are first processed to extract features as described in
the manuscript. The features corresponding to chronic insomnia subject are labelled
as -1 and the features extracted from healthy cohabiting partners are labelled as
+1 for modelling using a supervised architecture. 
Corresponding Code: Main_FeatureExtraction.m

2) The extracted features are then used for modelling and training a supervised
machine learning classifier to develop a pediction model for detecting individuals
with chronic insomnia using wrist-actigraphy data.
Corresponding Code: ML_Modelling.m
  
For further details please refer to the manuscript "A machine learning model for 
multi-night actigraphic detection of chronic insomnia: development and 
validation of a pre-screening tool"

Description of files in the data repository:

1) Data: Actigraphy data stored in .\Data folder

	SubFolder:
		- Client: Chronic insomnia subjects
		- Partner: Healhty cohibiting partners

2) Code Files: The Feature extraction corressponding to seven nights is 
done by calling the code

	- Main File: Main_FeatureExtraction.m
	The output from the file is stored in a .xlsx file in .\Output_Features 
	which is then used to build the machine learning model
	- ML Modelling: ML_Modelling.m

3) Plots Files: The codes for the plots in the manuscript are inside the .\Plots
folder. Refer to ReadMe.txt file inside the folder for more details.

Folder Description:

(Folder) CI_Figures: Contains all the processed figures in .tif format that are 
			in the manuscript.

(Folder) Data: contains the actigraphy data used in the study

(Folder) OutputFeatures: location where the output from Main_FeatureExtraction.m
			file is stored. The generated .xlsx file is then used for
			ML modelling

(Folder) Plots: contains the codes for generating the plots in the manuscript

(Folder) Dependencies: conatains codes and dependencies used by main files  