%% Read data
clear all
close all
clc

addpath ('.\Dependencies')
Path = '.\Dependencies\Data_IDMatched\ChrInsHealthy11May_7Nights.xlsx';
[M,actInfo]=xlsread(Path);
data=M(:,4:end);
class=M(:,3);
index=M(:,1);

healthNo=max(index(class==1));
index(class==-1)=index(class==-1)+healthNo; % assign uniq index for each patient

class(class==-1)=2;
Lnight=sum(index==1); % number of nights per patient

%% training and testing nights
% Tclass is predicted night via 10-fold cross validation

[ data ] = normalize( data );
a=[data class];
k=10; % folds=1
  [Tclass] = tRF(data,class,k);%RF
%  [Tclass] = tSVM(data,class,k);  % SVM

%   [trainedClassifier, validationAccuracy,Tclass] = trainClassifier(a); % SVM
% [trainedClassifier, validationAccuracy,Tclass] = trainClassifierT(a);  %RF

cp = classperf(class,Tclass,'Positive',[2],'Negative',[1]);
NightAc=cp.CorrectRate;
NightSensi=cp.Sensitivity;
NightSpeci=cp.Specificity;

nightResults=[NightAc NightSensi NightSpeci]; % night-based Accuracy, Sensitivity, Sepecifity



%% training and testing subjects
% Tsub is predicted via one subject out

U=unique(index(:,1));
Subj=U;
Subj(Subj<25)=1;
Subj(Subj>24)=2;

labelSub=Subj-Subj+1;
Thre=[];

for j=1:length(U)
    i=U(j);
    
%     Cdata=data(index~=i,:);
%     Cclass=class(index~=i,:);

% training
    Tindex=index(index~=i,:);
    
    for t1=1:Lnight
        ind=unique(Tindex(:,1));
        cla=ind;
        cla(cla<25)=1;
        cla(cla>24)=2;
        Tcla=ind-ind+1;
        Nbad=[];
        for ii=1:length(ind)
            t=Tclass(index(:,1)==ind(ii));
            Nbad(ii)=sum(t==2);
        end
        Tcla(Nbad>=t1)=2;
        cp = classperf(cla,Tcla,'Positive',[2],'Negative',[1]);
        subjectsAc(t1)=cp.CorrectRate;
    end
    [~,T]=max(subjectsAc);    
    Thre(j)=T;
    
 % testing
    if sum(Tclass(index==i,:)==2)>=T
        labelSub(j)=2;
    end
    
end

cp = classperf(Subj,labelSub,'Positive',[2],'Negative',[1]);
subjectsAc=cp.CorrectRate;
SubSensi=cp.Sensitivity;
SubSpeci=cp.Specificity;

subjectResults=[subjectsAc SubSensi SubSpeci] % subject-based Accuracy, Sensitivity, Sepecifity

%tabulate(Thre)


%% plot threshold selection

labelNight=Tclass;


for t1=1:Lnight
    ind=unique(index(:,1));
    cla=[];
    Tcla=ind-ind+1;
    ind=unique(index(:,1));
    Nbad=[];
    for i=1:length(ind)
        t=labelNight(index(:,1)==ind(i));
        Nbad(i)=sum(t==2);
    end    
    Tcla(Nbad>=t1)=2;    
    cla=ind;
    cla(cla<25)=1;
    cla(cla>24)=2; 
    
    cp = classperf(cla,Tcla,'Positive',[2],'Negative',[1]);
    subjectsAc(t1)=cp.CorrectRate ;
    SubSensi(t1)=cp.Sensitivity;
    SubSpeci(t1)=cp.Specificity;    
end
 
%%{ 
Score=[subjectsAc;SubSensi;SubSpeci];

Nights = [1:1:Lnight];

figure2 = figure('Position',[0 0 600 400]);

% Create axes
axes1 = axes('Parent',figure2);
box(axes1,'on');
hold(axes1,'all');

% Create multiple lines using matrix input to plot
plot1 = plot(Nights,Score,'Parent',axes1,'MarkerSize',10,'Linewidth',2);

set(plot1(1),'DisplayName','Accuracy');
set(plot1(2),'DisplayName','Sensitivity');
set(plot1(3),'DisplayName','Specificity');


plot1(1).Marker = '^';
plot1(2).Marker = '*';
plot1(3).Marker = 'd';

set(gcf,'color','w');

legend(axes1,'location','best');

xlim([1 Lnight]);
ylim([0 1]);

% Create legend
set(gca,'FontSize',18);
ylabel('Score','FontSize',18);
xlabel('Day threshold','FontSize',18);
set(gca,'LooseInset',get(gca,'TightInset'))
%}

%% plot AUC 

% perfcurve is described on https://au.mathworks.com/help/stats/perfcurve.html
[X,Y,T,AUC, OPT] = perfcurve(cla,Nbad',2); %  cla is the subject label; Nbad is number of bad nights classfied for each subject; 2 indicate the ppstive class label
figure
plot(X,Y)
xlabel('False positive rate') 
ylabel('True positive rate')
title('ROC for Classification by RF') % Uncoment line 24 for SVM curve and comment line 23

