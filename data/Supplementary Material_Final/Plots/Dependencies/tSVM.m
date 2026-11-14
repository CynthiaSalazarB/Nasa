function [Tclass] = tSVM(data,class,k)
%TSVM 此处显示有关此函数的摘要
%   此处显示详细说明


indices = crossvalind('Kfold',class,k);

Tclass=class-class;

for i=1:k

    trainD=data(indices~=i,:);
    trainC=class(indices~=i,:);
    
    testD=data(indices==i,:);
    testC=class(indices==i,:);     
    
    %%%% normalise    
    
ntrainD=[];
ntestD=[];

for ii=1:size(data,2)
    d=trainD(:,ii);
    td=testD(:,ii);
    Ma=max(d);
    Mi=min(d);
    if (Ma-Mi)==0
        d=zeros(size(d,1),1);
        ntrainD=[ntrainD d];
        ntestD=[ntestD td./Ma];
    else
    d=(d-Mi)./(Ma-Mi);
    ntrainD=[ntrainD d];    
    td=(td-Mi)./(Ma-Mi);
    ntestD=[ntestD td];       
    end
end

 trainD=ntrainD;
 testD=ntestD;
    
    %%%%%
    
classificationSVM = fitcsvm(...
    trainD, ...
    trainC, ...
    'KernelFunction', 'linear', ...
    'PolynomialOrder', [], ...
    'KernelScale', 'auto', ...
    'BoxConstraint', 1, ...
    'Standardize', true );

C=predict(classificationSVM,testD);
Tclass(indices==i)=C;

end
 
end

