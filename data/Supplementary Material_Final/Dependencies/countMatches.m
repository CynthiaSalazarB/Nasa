function noMatches=countMatches(matrix,vector,range)
%matrix has same number of column as number of elements in the vector
[m,n]=size(matrix);

[p,q]=size(vector);
if(p==1)%row vector
    vMatrix=repmat(vector,m,1);
else%column vector
    vMatrix=repmat(vector',m,1);
end

diffVal=abs(matrix-vMatrix);
maxDiff=max(diffVal');
noMatches=sum(maxDiff<range);